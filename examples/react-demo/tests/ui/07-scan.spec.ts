import { expect, test } from './fixtures'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Meal scan renders detections', async ({ page }) => {
  await openDemo(page, '/scan')
  await byId(page, 'scan-sample').click()
  await expect(byId(page, 'scan-preview')).toBeVisible()
  await byId(page, 'scan-analyze').click()
  await expect(byId(page, 'scan-results')).toBeVisible()
  await expect(byId(page, 'scan-results')).toContainText('Fixture photo meal')
  await expect(byId(page, 'scan-results')).toContainText('Fixture Pizza')
  await byId(page, 'scan-another').click()
  await expect(byId(page, 'scan-guide')).toBeVisible()
  await expect(byId(page, 'scan-results')).toHaveCount(0)
})
