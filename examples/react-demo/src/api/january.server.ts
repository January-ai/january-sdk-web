import {
  JanuaryClient,
  JanuaryTokenProviderError,
  type JanuaryClientTokenResponse,
} from '@januaryai/web-sdk'
import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'
import { resolve } from 'node:path'

loadLocalDemoEnvironment()

function loadLocalDemoEnvironment() {
  const candidates = [
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '../..', '.env.local'),
  ]
  const envFile = candidates.find(existsSync)
  if (envFile) loadEnvFile(envFile)
}

export function hasJanuaryConfiguration() {
  return Boolean(
    process.env.PARTNER_TOKEN_URL?.trim()
    || (process.env.JANUARY_API_KEY ?? process.env.JANUARY_PROD_API_KEY ?? process.env.JANUARY_DEV_API_KEY)?.trim(),
  )
}

let cachedClient: JanuaryClient | undefined
let cachedClientConfiguration: string | undefined
// A client token is bound to the end user it was minted for, so client-token mode keeps one client
// per end user, each minting for its own user.
const clientTokenClients = new Map<string, JanuaryClient>()
let prefetchedClientToken: { endUserId: string; token: JanuaryClientTokenResponse } | undefined
let tokenState:
  | { status: 'idle' }
  | { status: 'ready'; mintedAt: string; expiresAt: string; expiresIn: number }
  | { status: 'error'; message: string } = { status: 'idle' }

export async function getDemoConfigurationDetails() {
  const partnerTokenUrl = process.env.PARTNER_TOKEN_URL?.trim()
  const apiKey = (process.env.JANUARY_API_KEY ?? process.env.JANUARY_PROD_API_KEY ?? process.env.JANUARY_DEV_API_KEY)?.trim()
  const authMode = partnerTokenUrl
    ? 'client-token'
    : apiKey
      ? 'development-api-key'
      : 'unconfigured'
  const localRelay = partnerTokenUrl ? isLocalTokenRelay(partnerTokenUrl) : false
  const relayRunning = localRelay ? await checkLocalRelay(partnerTokenUrl!) : null

  return {
    configured: authMode !== 'unconfigured',
    defaultEndUserId: getDefaultEndUserId(),
    authMode,
    relay: partnerTokenUrl
      ? {
          configured: true,
          local: localRelay,
          running: relayRunning,
          displayUrl: localRelay ? partnerTokenUrl : undefined,
        }
      : { configured: false, local: false, running: null, displayUrl: undefined },
    token: tokenState,
  } as const
}

/** Mints a token for `endUserId` (the configured default user when omitted) and hands it to that user's client. */
export async function mintFreshDemoClientToken(endUserId?: string) {
  const partnerTokenUrl = requirePartnerTokenUrl()
  const user = endUserId?.trim() || requireEndUserId()
  const partnerAppSessionToken = process.env.PARTNER_APP_SESSION_TOKEN?.trim()
  if (!isLocalTokenRelay(partnerTokenUrl) && !partnerAppSessionToken) {
    throw new Error('PARTNER_APP_SESSION_TOKEN is required for a non-local PARTNER_TOKEN_URL.')
  }
  const token = await fetchPartnerClientToken(partnerTokenUrl, user, partnerAppSessionToken)
  prefetchedClientToken = { endUserId: user, token }
  clientTokenClients.delete(clientTokenKey(partnerTokenUrl, partnerAppSessionToken, user))
  return tokenState
}

/**
 * The SDK client for a request. In client-token mode the token decides whose data the API reads and
 * writes (the SDK sends no end-user header with a client token), so the client must be the one whose
 * tokens are minted for `endUserId`; without one, the configured default user is used.
 */
export function getJanuaryClient(endUserId?: string) {
  const partnerTokenUrl = process.env.PARTNER_TOKEN_URL?.trim()
  const partnerAppSessionToken = process.env.PARTNER_APP_SESSION_TOKEN?.trim()
  const apiKey = process.env.JANUARY_API_KEY ?? process.env.JANUARY_PROD_API_KEY ?? process.env.JANUARY_DEV_API_KEY
  const testApiUrl = process.env.JANUARY_TEST_API_URL?.trim()

  if (partnerTokenUrl) {
    const user = endUserId?.trim() || getDefaultEndUserId()
    if (!user) {
      throw new Error('JANUARY_END_USER_ID is required when PARTNER_TOKEN_URL is configured.')
    }
    const localRelay = isLocalTokenRelay(partnerTokenUrl)
    if (!localRelay && !partnerAppSessionToken) {
      throw new Error('PARTNER_APP_SESSION_TOKEN is required for a non-local PARTNER_TOKEN_URL.')
    }
    const key = clientTokenKey(partnerTokenUrl, partnerAppSessionToken, user)
    const existing = clientTokenClients.get(key)
    if (existing) return existing
    const client = new JanuaryClient({
      clientTokenProvider: async () => {
        if (prefetchedClientToken?.endUserId === user) {
          const { token } = prefetchedClientToken
          prefetchedClientToken = undefined
          return token
        }
        return fetchPartnerClientToken(partnerTokenUrl, user, partnerAppSessionToken)
      },
      ...(testApiUrl ? { fetch: createTestApiFetch(testApiUrl) } : {}),
    })
    clientTokenClients.set(key, client)
    return client
  }

  const configuration = `key:${apiKey?.trim() ?? ''}:${testApiUrl ?? ''}`
  if (cachedClient && cachedClientConfiguration === configuration) return cachedClient

  if (!apiKey?.trim()) {
    throw new Error(
      'Add PARTNER_TOKEN_URL, JANUARY_API_KEY, JANUARY_PROD_API_KEY, or JANUARY_DEV_API_KEY to .env.local, then restart the demo.',
    )
  }

  cachedClient = new JanuaryClient({
    developmentApiKey: apiKey,
    ...(testApiUrl ? { fetch: createTestApiFetch(testApiUrl) } : {}),
  })
  cachedClientConfiguration = configuration
  return cachedClient
}

function isLocalTokenRelay(value: string) {
  const hostname = new URL(value).hostname
  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]' || hostname === '::1'
}

async function fetchPartnerClientToken(
  partnerTokenUrl: string,
  endUserId: string,
  partnerAppSessionToken?: string,
): Promise<JanuaryClientTokenResponse> {
  let response: Response
  try {
    response = await fetch(partnerTokenUrl, {
      method: 'POST',
      headers: {
        ...(partnerAppSessionToken ? { Authorization: `Bearer ${partnerAppSessionToken}` } : {}),
        'January-End-User-ID': endUserId,
      },
    })
  } catch (error) {
    tokenState = { status: 'error', message: 'The token relay is not running.' }
    throw new JanuaryTokenProviderError(
      'The partner token endpoint is unavailable.',
      { retryable: true, cause: error },
    )
  }
  if (!response.ok) {
    const message = await responseErrorMessage(response, 'The partner token endpoint rejected the request.')
    tokenState = { status: 'error', message }
    throw new JanuaryTokenProviderError(message, {
      retryable: response.status === 408 || response.status === 429 || response.status >= 500,
    })
  }
  const token = await response.json() as {
    token?: unknown
    expiresIn?: unknown
    expires_in?: unknown
  }
  const expiresIn = 'expiresIn' in token ? token.expiresIn : token.expires_in
  if (typeof token.token !== 'string' || typeof expiresIn !== 'number') {
    tokenState = { status: 'error', message: 'The token relay returned an invalid response.' }
    throw new Error('The partner token endpoint returned an invalid response.')
  }
  const mintedAt = new Date()
  tokenState = {
    status: 'ready',
    mintedAt: mintedAt.toISOString(),
    expiresAt: new Date(mintedAt.getTime() + expiresIn * 1_000).toISOString(),
    expiresIn,
  }
  console.info(`January demo fetched a short-lived token valid for ${expiresIn} seconds.`)
  return { token: token.token, expiresIn }
}

async function checkLocalRelay(partnerTokenUrl: string) {
  try {
    const response = await fetch(new URL('/', partnerTokenUrl), {
      signal: AbortSignal.timeout(1_000),
    })
    return response.ok
  } catch {
    return false
  }
}

async function responseErrorMessage(response: Response, fallback: string) {
  try {
    const body = await response.clone().json() as { message?: unknown; error?: unknown }
    if (typeof body.message === 'string') return body.message
    if (typeof body.error === 'string') return body.error
  } catch {
    // Keep the safe fallback when the relay does not return JSON.
  }
  return fallback
}

function requirePartnerTokenUrl() {
  const value = process.env.PARTNER_TOKEN_URL?.trim()
  if (!value) throw new Error('PARTNER_TOKEN_URL is not configured.')
  return value
}

function requireEndUserId() {
  const value = getDefaultEndUserId()
  if (!value) throw new Error('JANUARY_END_USER_ID is not configured.')
  return value
}

function clientTokenKey(partnerTokenUrl: string, partnerAppSessionToken: string | undefined, endUserId: string) {
  return `${partnerTokenUrl}:${partnerAppSessionToken ?? ''}:${endUserId}`
}

function createTestApiFetch(baseUrl: string): typeof fetch {
  return async (input, init) => {
    const source = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
    const target = new URL(`${source.pathname}${source.search}`, baseUrl)
    return fetch(target, init)
  }
}

export function getDefaultEndUserId() {
  return process.env.JANUARY_END_USER_ID?.trim() ?? ''
}
