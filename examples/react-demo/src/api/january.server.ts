import { JanuaryPartnerClient } from '@januaryai/partner-sdk'
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
  return Boolean((process.env.JANUARY_API_KEY ?? process.env.JANUARY_DEV_API_KEY)?.trim())
}

export function getJanuaryClient() {
  const apiKey = process.env.JANUARY_API_KEY ?? process.env.JANUARY_DEV_API_KEY
  if (!apiKey?.trim()) {
    throw new Error('Add JANUARY_DEV_API_KEY to the repository .env.local file, then restart the demo.')
  }

  return new JanuaryPartnerClient({
    apiKey,
    ...(process.env.JANUARY_API_BASE_URL
      ? { baseUrl: process.env.JANUARY_API_BASE_URL }
      : {}),
  })
}

export function getDefaultEndUserId() {
  return process.env.JANUARY_END_USER_ID?.trim() ?? ''
}
