import { expect, test } from './fixtures'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Food category selection reaches search', async ({ page }) => {
  await openDemo(page, '/search')
  await byId(page, 'category-general').click()
  await byId(page, 'search-input').fill('pizza')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'search-results')).toBeVisible()
  await expect(byId(page, 'food-result-0')).toContainText('Fixture Pizza')
  await byId(page, 'category-branded').click()
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'food-result-0')).toBeVisible()
  await byId(page, 'category-all').click()
})
