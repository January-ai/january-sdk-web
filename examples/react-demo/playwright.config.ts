import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/ui',
  fullyParallel: false,
  workers: 1,
  preserveOutput: 'always',
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:3010',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node tests/ui/fixture-server.mjs',
      port: 18767,
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 3010',
      env: {
        JANUARY_END_USER_ID: 'fixture-user',
        JANUARY_TEST_API_URL: 'http://127.0.0.1:18767',
        PARTNER_TOKEN_URL: 'http://127.0.0.1:18767/january-token',
      },
      port: 3010,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
