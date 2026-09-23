import { test as base } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export * from '@playwright/test'

/**
 * The suite's `test`. With UI_LINE_COVERAGE set (`npm run test:ui:lines`), it records the
 * browser's V8 coverage of the demo's own modules for every test, which
 * scripts/ui-line-coverage.mjs maps back to lines of src. Otherwise it is Playwright's test.
 */
export const test = base.extend<{ lineCoverage: void }>({
  lineCoverage: [async ({ page }, use, testInfo) => {
    if (!process.env.UI_LINE_COVERAGE) return use()
    await page.coverage.startJSCoverage({ resetOnNavigation: false })
    await use()
    const entries = (await page.coverage.stopJSCoverage()).filter(({ url }) => new URL(url).pathname.startsWith('/src/'))
    const directory = join(testInfo.project.outputDir, 'v8-coverage')
    mkdirSync(directory, { recursive: true })
    writeFileSync(join(directory, `${testInfo.testId}.json`), JSON.stringify(entries))
  }, { auto: true }],
})
