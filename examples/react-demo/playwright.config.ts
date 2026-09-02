import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/ui',
  fullyParallel: false,
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
        JANUARY_DEV_API_KEY: 'fixture-key',
        JANUARY_TEST_API_URL: 'http://127.0.0.1:18767',
      },
      port: 3010,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
