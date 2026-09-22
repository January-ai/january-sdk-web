import { expect, test } from '@playwright/test'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Launch and primary navigation', async ({ page }) => {
  await openDemo(page, '/search')
  await expect(byId(page, 'search-screen')).toBeVisible()
  await expect(byId(page, 'search-input')).toBeVisible()
  await expect(byId(page, 'search-prompt')).toBeVisible()
  for (const id of ['category-all', 'category-general', 'category-branded', 'category-recipe']) {
    await expect(byId(page, id)).toBeVisible()
  }
  for (const id of ['tab-search', 'tab-scan', 'tab-tracking', 'tab-food-logs', 'tab-glucose']) {
    await expect(byId(page, id).filter({ visible: true }).first()).toBeVisible()
  }
  await expect(byId(page, 'search-results')).toHaveCount(0)
})
