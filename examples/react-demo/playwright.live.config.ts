import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'node:path'

// The live suite: the demo against the real January API, with client tokens from a
// running token relay. It creates and deletes logs for LIVE_END_USER_ID, so use a
// dedicated test user. Not part of `npm run test:ui` or CI; run `npm run test:ui:live`.
const relayUrl = process.env.PARTNER_TOKEN_URL ?? 'http://127.0.0.1:8787/api/january/client-token'
const endUserId = process.env.LIVE_END_USER_ID ?? 'e2e-qa-web'
const evidenceDir = resolve(process.env.LIVE_EVIDENCE_DIR ?? 'test-results/live')

process.env.LIVE_EVIDENCE_DIR = evidenceDir
process.env.LIVE_END_USER_ID = endUserId
process.env.PARTNER_TOKEN_URL = relayUrl

export default defineConfig({
  testDir: './tests/live',
  globalSetup: './tests/live/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // Photo analysis and corrections can take a while on the real API.
  timeout: 240_000,
  expect: { timeout: 45_000 },
  reporter: [
    ['list', { printSteps: true }],
    ['json', { outputFile: resolve(evidenceDir, 'playwright-report.json') }],
    ['html', { outputFolder: resolve(evidenceDir, 'playwright-html'), open: 'never' }],
  ],
  outputDir: resolve(evidenceDir, 'playwright'),
  use: {
    baseURL: 'http://127.0.0.1:3020',
    screenshot: 'on',
    trace: 'on',
    actionTimeout: 30_000,
  },
  projects: [{ name: 'chromium-live', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 3020',
    env: {
      PARTNER_TOKEN_URL: relayUrl,
      JANUARY_END_USER_ID: endUserId,
      ...(process.env.PARTNER_APP_SESSION_TOKEN ? { PARTNER_APP_SESSION_TOKEN: process.env.PARTNER_APP_SESSION_TOKEN } : {}),
    },
    port: 3020,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
  },
})
