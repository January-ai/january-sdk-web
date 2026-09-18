import { expect, test } from '@playwright/test'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Search failure and retry retain the query', async ({ page }) => {
  await control('/v1.2/foods', { status: 500 })
  await openDemo(page, '/search')
  await byId(page, 'search-input').fill('pizza')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'search-error')).toBeVisible()
  await expect(byId(page, 'search-input')).toHaveValue('pizza')

  await control('/v1.2/foods', { status: 200 })
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'search-results')).toBeVisible()
  await expect(byId(page, 'food-result-0')).toBeVisible()
  await expect(byId(page, 'search-error')).toHaveCount(0)
})
