import { expect, test } from '@playwright/test'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Native parity - scan surfaces', async ({ page }) => {
  await openDemo(page, '/scan')
  await expect(byId(page, 'scan-guide')).toBeVisible()
  await byId(page, 'scan-image-url').click()
  await byId(page, 'image-url-input').fill('/sample-meal.jpg')
  await byId(page, 'image-url-use').click()
  await expect(byId(page, 'scan-preview')).toBeVisible()
  await byId(page, 'scan-analyze').click()
  await expect(byId(page, 'scan-results')).toContainText('Fixture photo meal')
  await byId(page, 'scan-another').click()
  await expect(byId(page, 'scan-guide')).toBeVisible()
})
