import { expect, test } from '@playwright/test'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('User context shows SDK configuration', async ({ page }) => {
  await openDemo(page, '/food-logs')
  await expect(byId(page, 'food-log-user-card')).toBeVisible()
  await expect(byId(page, 'food-log-user-card')).toContainText('fixture-user')
  await expect(byId(page, 'configuration-card')).toBeVisible()
})
