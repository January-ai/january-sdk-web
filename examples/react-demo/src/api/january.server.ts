import {
  JanuaryPartnerClient,
  type JanuaryClientTokenResponse,
} from '@januaryai/partner-sdk'
import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'
import { resolve } from 'node:path'

loadLocalDemoEnvironment()

function loadLocalDemoEnvironment() {
  if (process.env.JANUARY_API_KEY || process.env.JANUARY_DEV_API_KEY) return

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

let cachedClient: JanuaryPartnerClient | undefined
let cachedClientConfiguration: string | undefined

export function getJanuaryClient() {
  const partnerTokenUrl = process.env.PARTNER_TOKEN_URL?.trim()
  const internalApiBaseUrl = process.env.JANUARY_INTERNAL_API_BASE_URL?.trim()
  const endUserId = getDefaultEndUserId()
  const apiKey = process.env.JANUARY_API_KEY ?? process.env.JANUARY_DEV_API_KEY
  const configuration = partnerTokenUrl
    ? `token:${partnerTokenUrl}:${internalApiBaseUrl ?? ''}:${endUserId}`
    : `key:${internalApiBaseUrl ?? ''}:${apiKey?.trim() ?? ''}`
  if (cachedClient && cachedClientConfiguration === configuration) return cachedClient

  if (partnerTokenUrl) {
    if (!endUserId) {
      throw new Error('JANUARY_END_USER_ID is required when PARTNER_TOKEN_URL is configured.')
    }
    if (!internalApiBaseUrl) {
      throw new Error(
        'JANUARY_INTERNAL_API_BASE_URL is required when PARTNER_TOKEN_URL is configured.',
      )
    }
    cachedClient = new JanuaryPartnerClient({
      clientTokenProvider: async () => {
        const url = new URL(partnerTokenUrl)
        url.searchParams.set('user', endUserId)
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`The partner token endpoint returned HTTP ${response.status}.`)
        }
        const token = await response.json() as {
          token?: unknown
          expiresIn?: unknown
          expires_in?: unknown
        }
        const expiresIn = 'expiresIn' in token ? token.expiresIn : token.expires_in
        if (typeof token.token !== 'string' || typeof expiresIn !== 'number') {
          throw new Error('The partner token endpoint returned an invalid response.')
        }
        console.info(`January demo fetched a short-lived token valid for ${expiresIn} seconds.`)
        return { token: token.token, expiresIn } satisfies JanuaryClientTokenResponse
      },
      fetch: createInternalApiFetch(internalApiBaseUrl),
    })
    cachedClientConfiguration = configuration
    return cachedClient
  }

  if (!apiKey?.trim()) {
    throw new Error(
      'Add PARTNER_TOKEN_URL or JANUARY_DEV_API_KEY to .env.local, then restart the demo.',
    )
  }

  cachedClient = new JanuaryPartnerClient({
    apiKey,
    ...(internalApiBaseUrl ? { fetch: createInternalApiFetch(internalApiBaseUrl) } : {}),
  })
  cachedClientConfiguration = configuration
  return cachedClient
}

function createInternalApiFetch(apiBaseUrl: string): typeof globalThis.fetch {
  const baseUrl = new URL(apiBaseUrl)
  return (input, init) => {
    const original = new URL(input instanceof Request ? input.url : input)
    const rewritten = new URL(`${original.pathname}${original.search}`, baseUrl)
    return globalThis.fetch(rewritten, init)
  }
}

export function getDefaultEndUserId() {
  return process.env.JANUARY_END_USER_ID?.trim() ?? ''
}
