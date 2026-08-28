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
    (process.env.PARTNER_TOKEN_URL?.trim() && process.env.PARTNER_APP_SESSION_TOKEN?.trim())
    || (process.env.JANUARY_API_KEY ?? process.env.JANUARY_DEV_API_KEY)?.trim(),
  )
}

let cachedClient: JanuaryClient | undefined
let cachedClientConfiguration: string | undefined

export function getJanuaryClient() {
  const partnerTokenUrl = process.env.PARTNER_TOKEN_URL?.trim()
  const partnerAppSessionToken = process.env.PARTNER_APP_SESSION_TOKEN?.trim()
  const endUserId = getDefaultEndUserId()
  const apiKey = process.env.JANUARY_API_KEY ?? process.env.JANUARY_DEV_API_KEY
  const configuration = partnerTokenUrl
    ? `token:${partnerTokenUrl}:${partnerAppSessionToken ?? ''}:${endUserId}`
    : `key:${apiKey?.trim() ?? ''}`
  if (cachedClient && cachedClientConfiguration === configuration) return cachedClient

  if (partnerTokenUrl) {
    if (!endUserId) {
      throw new Error('JANUARY_END_USER_ID is required when PARTNER_TOKEN_URL is configured.')
    }
    if (!partnerAppSessionToken) {
      throw new Error('PARTNER_APP_SESSION_TOKEN is required when PARTNER_TOKEN_URL is configured.')
    }
    cachedClient = new JanuaryClient({
      clientTokenProvider: async () => {
        let response: Response
        try {
          response = await fetch(partnerTokenUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${partnerAppSessionToken}`,
              'x-end-user-id': endUserId,
            },
          })
        } catch (error) {
          throw new JanuaryTokenProviderError(
            'The partner token endpoint is unavailable.',
            { retryable: true, cause: error },
          )
        }
        if (!response.ok) {
          throw new JanuaryTokenProviderError(
            'The partner token endpoint rejected the request.',
            { retryable: response.status === 408 || response.status === 429 || response.status >= 500 },
          )
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
  })
  cachedClientConfiguration = configuration
  return cachedClient
}

export function getDefaultEndUserId() {
  return process.env.JANUARY_END_USER_ID?.trim() ?? ''
}
