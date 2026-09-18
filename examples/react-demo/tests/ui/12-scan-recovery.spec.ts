import { expect, test } from '@playwright/test'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Scan failure recovers without losing the photo', async ({ page }) => {
  await control('/v1.2/food-analysis/image', { status: 500 })
  await openDemo(page, '/scan')
  await byId(page, 'scan-sample').click()
  await expect(byId(page, 'scan-preview')).toBeVisible()
  await byId(page, 'scan-analyze').click()
  await expect(byId(page, 'scan-error')).toBeVisible()

  await expect(byId(page, 'scan-preview')).toBeVisible()

  await control('/v1.2/food-analysis/image', { status: 200 })
  await byId(page, 'scan-error-retry').click()
  await expect(byId(page, 'scan-results')).toContainText('Fixture photo meal')
  await expect(byId(page, 'scan-error')).toHaveCount(0)
})
