import { expect, test } from '@playwright/test'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Native parity - search and food detail surfaces', async ({ page }) => {
  await openDemo(page, '/search')
  await byId(page, 'search-input').fill('pizza')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'search-results')).toBeVisible()
  await expect(byId(page, 'food-result-0')).toContainText('Fixture Pizza')
  await byId(page, 'food-result-0').click()
  await expect(byId(page, 'food-detail-screen')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Fixture Pizza' })).toBeVisible()
  await expect(byId(page, 'food-macros')).toBeVisible()
  await expect(byId(page, 'food-nutrition')).toBeVisible()
  await expect(byId(page, 'food-serving-unit')).toBeVisible()
  await byId(page, 'food-check-glucose').click()
  await expect(byId(page, 'food-glucose-result')).toBeVisible()
  await expect(page.getByText('Likely peak')).toBeVisible()
  await byId(page, 'food-detail-back').click()
  await expect(byId(page, 'search-screen')).toBeVisible()
})
