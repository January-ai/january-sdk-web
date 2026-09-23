import { expect, test } from '@playwright/test'
import { byId, control, fixtureRequests, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Food search loading, recipe category, and scope switching', async ({ page }) => {
  await control('/v1.2/foods', { delay: 2 })
  await openDemo(page, '/search')
  await byId(page, 'search-scope-restaurants').click()
  await expect(byId(page, 'restaurant-search-input')).toBeVisible()
  await byId(page, 'search-scope-foods').click()
  await expect(byId(page, 'search-input')).toBeVisible()
  await byId(page, 'category-recipe').click()
  await byId(page, 'search-input').fill('lasagna')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'search-loading')).toBeVisible()
  await expect(byId(page, 'food-result-0')).toContainText('Fixture Pizza', { timeout: 15_000 })
  await expect(byId(page, 'search-loading')).toHaveCount(0)

  const searches = (await fixtureRequests()).filter(({ path }) => path === '/v1.2/foods')
  expect(searches.at(-1)?.query).toMatchObject({ query: 'lasagna', type: 'recipe' })
})

test('Barcode search mode finds a UPC and shows an unknown one as no match', async ({ page }) => {
  await openDemo(page, '/search')
  await byId(page, 'search-mode-barcode').click()
  // Voice is for names; a UPC is typed.
  await expect(byId(page, 'search-voice')).toBeDisabled()
  await expect(byId(page, 'category-all')).toHaveCount(0)
  await byId(page, 'search-input').fill('012345678905')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'food-result-0')).toContainText('Fixture Pizza')

  // The API answers an unknown UPC with 404; the demo shows that as "no match", not a failure.
  await byId(page, 'search-input').fill('000000000000')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'empty-results')).toBeVisible()
  await expect(byId(page, 'search-error')).toHaveCount(0)
  const lookups = (await fixtureRequests()).filter(({ path }) => path.startsWith('/v1.2/foods/barcode/'))
  expect(lookups.map(({ path }) => path)).toEqual(['/v1.2/foods/barcode/012345678905', '/v1.2/foods/barcode/000000000000'])

  await byId(page, 'search-mode-name').click()
  await expect(byId(page, 'category-all')).toBeVisible()
})
