import { expect, test } from '@playwright/test'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Native parity - restaurants and menu surfaces', async ({ page }) => {
  await openDemo(page, '/search')
  await byId(page, 'search-scope-restaurants').click()
  await expect(byId(page, 'restaurant-search-screen')).toBeVisible()
  await byId(page, 'restaurant-search-input').fill('Fixture Cafe')
  await byId(page, 'restaurant-search-submit').click()
  await expect(byId(page, 'restaurant-result-0')).toContainText('Fixture Cafe')
  await byId(page, 'restaurant-result-0').click()
  await expect(byId(page, 'restaurant-detail-screen')).toBeVisible()
  await expect(byId(page, 'restaurant-menu-item-0')).toContainText('Fixture bowl')
  await expect(byId(page, 'menu-results')).toBeVisible()
})
