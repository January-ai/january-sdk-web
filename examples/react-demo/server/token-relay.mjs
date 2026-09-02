import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnvFile } from 'node:process'

loadLocalEnvironment()

const apiKey = process.env.JANUARY_API_KEY?.trim()
const port = integerEnvironment('JANUARY_TOKEN_RELAY_PORT', 8787, 1, 65_535)
const ttlSeconds = integerEnvironment('JANUARY_TOKEN_TTL_SECONDS', 1_800, 300, 7_200)
const scopes = [
  'foods:read',
  'food_analysis:write',
  'food_logs:read',
  'food_logs:write',
  'glucose:read',
  'restaurants:read',
]

if (!apiKey) throw new Error('JANUARY_API_KEY is required in .env.local.')

const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store')

  if (request.method === 'GET' && request.url === '/health') {
    return json(response, 200, { ok: true })
  }

  if (request.method !== 'POST' || !['/january-token', '/january-token/revoke'].includes(request.url)) {
    return json(response, 404, { error: 'Not found.' })
  }

  const endUserId = request.headers['x-end-user-id']?.trim()
  if (!endUserId || endUserId.length > 256) {
    return json(response, 400, { error: 'A valid x-end-user-id header is required.' })
  }

  let upstream
  try {
    const revoke = request.url === '/january-token/revoke'
    upstream = await fetch(
      revoke
        ? 'https://partners.january.ai/v1.2/auth/client-token-revocations'
        : 'https://partners.january.ai/v1.2/auth/client-tokens',
      {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(revoke
        ? { end_user_id: endUserId }
        : {
            end_user_id: endUserId,
            scopes,
            ttl_seconds: ttlSeconds,
          }),
      },
    )
  } catch {
    return json(response, 502, { error: 'January token service is unavailable.' })
  }

  const body = await upstream.text()
  response.statusCode = upstream.status
  response.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
  response.end(body)
})

server.listen(port, '127.0.0.1', () => {
  console.info(`January token relay listening on http://127.0.0.1:${port}/january-token`)
})

function loadLocalEnvironment() {
  const candidates = [
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '../..', '.env.local'),
  ]
  const envFile = candidates.find(existsSync)
  if (envFile) loadEnvFile(envFile)
}

function integerEnvironment(name, fallback, minimum, maximum) {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} through ${maximum}.`)
  }
  return value
}

function json(response, status, body) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(body))
}
