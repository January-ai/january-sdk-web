import { expect, test } from '@playwright/test'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Every primary destination is reachable', async ({ page }) => {
  await openDemo(page, '/search')
  await byId(page, 'tab-scan').filter({ visible: true }).first().click()
  await expect(byId(page, 'scan-screen')).toBeVisible()
  await byId(page, 'tab-food-logs').filter({ visible: true }).first().click()
  await expect(byId(page, 'food-logs-screen')).toBeVisible()
  await byId(page, 'tab-glucose').filter({ visible: true }).first().click()
  await expect(byId(page, 'glucose-screen')).toBeVisible()
  await byId(page, 'tab-search').filter({ visible: true }).first().click()
  await expect(byId(page, 'search-screen')).toBeVisible()
})
