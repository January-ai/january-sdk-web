import { expect, test } from '@playwright/test'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Food search renders fixture results', async ({ page }) => {
  await openDemo(page, '/search')
  await byId(page, 'search-input').fill('pizza')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'search-results')).toBeVisible()
  await expect(byId(page, 'food-result-0')).toContainText('Fixture Pizza')
  await expect(page.getByText('For “pizza”')).toBeVisible()
})
