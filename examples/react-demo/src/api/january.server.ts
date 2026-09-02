import {
  JanuaryClient,
  JanuaryTokenProviderError,
  type JanuaryClientTokenResponse,
} from '@januaryai/sdk'
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
    || (process.env.JANUARY_API_KEY ?? process.env.JANUARY_DEV_API_KEY)?.trim(),
  )
}

let cachedClient: JanuaryClient | undefined
let cachedClientConfiguration: string | undefined
let prefetchedClientToken: JanuaryClientTokenResponse | undefined
let tokenState:
  | { status: 'idle' }
  | { status: 'ready'; mintedAt: string; expiresAt: string; expiresIn: number }
  | { status: 'revoked'; revokedAt: string; revokedCount: number }
  | { status: 'error'; message: string } = { status: 'idle' }

export async function getDemoConfigurationDetails() {
  const partnerTokenUrl = process.env.PARTNER_TOKEN_URL?.trim()
  const apiKey = (process.env.JANUARY_API_KEY ?? process.env.JANUARY_DEV_API_KEY)?.trim()
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

export async function mintFreshDemoClientToken() {
  const partnerTokenUrl = requirePartnerTokenUrl()
  const endUserId = requireEndUserId()
  const token = await fetchPartnerClientToken(partnerTokenUrl, endUserId)
  prefetchedClientToken = token
  resetCachedClient()
  return tokenState
}

export async function revokeDemoClientTokens() {
  const partnerTokenUrl = requirePartnerTokenUrl()
  const endUserId = requireEndUserId()
  if (!isLocalTokenRelay(partnerTokenUrl)) {
    throw new Error('Demo token revocation is available only with the local relay.')
  }
  const response = await fetch(new URL('/january-token/revoke', partnerTokenUrl), {
    method: 'POST',
    headers: { 'x-end-user-id': endUserId },
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, 'January rejected token revocation.'))
  const result = await response.json() as { revoked_count?: unknown }
  if (typeof result.revoked_count !== 'number') {
    throw new Error('The token relay returned an invalid revocation response.')
  }
  prefetchedClientToken = undefined
  resetCachedClient()
  tokenState = {
    status: 'revoked',
    revokedAt: new Date().toISOString(),
    revokedCount: result.revoked_count,
  }
  return tokenState
}

export function getJanuaryClient() {
  const partnerTokenUrl = process.env.PARTNER_TOKEN_URL?.trim()
  const partnerAppSessionToken = process.env.PARTNER_APP_SESSION_TOKEN?.trim()
  const endUserId = getDefaultEndUserId()
  const apiKey = process.env.JANUARY_API_KEY ?? process.env.JANUARY_DEV_API_KEY
  const testApiUrl = process.env.JANUARY_TEST_API_URL?.trim()
  const configuration = partnerTokenUrl
    ? `token:${partnerTokenUrl}:${partnerAppSessionToken ?? ''}:${endUserId}`
    : `key:${apiKey?.trim() ?? ''}:${testApiUrl ?? ''}`
  if (cachedClient && cachedClientConfiguration === configuration) return cachedClient

  if (partnerTokenUrl) {
    if (!endUserId) {
      throw new Error('JANUARY_END_USER_ID is required when PARTNER_TOKEN_URL is configured.')
    }
    const localRelay = isLocalTokenRelay(partnerTokenUrl)
    if (!localRelay && !partnerAppSessionToken) {
      throw new Error('PARTNER_APP_SESSION_TOKEN is required for a non-local PARTNER_TOKEN_URL.')
    }
    cachedClient = new JanuaryClient({
      clientTokenProvider: async () => {
        if (prefetchedClientToken) {
          const token = prefetchedClientToken
          prefetchedClientToken = undefined
          return token
        }
        return fetchPartnerClientToken(partnerTokenUrl, endUserId, partnerAppSessionToken)
      },
      ...(testApiUrl ? { fetch: createTestApiFetch(testApiUrl) } : {}),
    })
    cachedClientConfiguration = configuration
    return cachedClient
  }

  if (!apiKey?.trim()) {
    throw new Error(
      'Add PARTNER_TOKEN_URL or JANUARY_DEV_API_KEY to .env.local, then restart the demo.',
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
  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]'
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
        'x-end-user-id': endUserId,
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
    const response = await fetch(new URL('/health', partnerTokenUrl), {
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

function resetCachedClient() {
  cachedClient = undefined
  cachedClientConfiguration = undefined
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
