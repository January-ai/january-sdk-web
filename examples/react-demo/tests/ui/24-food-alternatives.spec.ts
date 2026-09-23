import { expect, test } from '@playwright/test'
import { byId, control, fixtureRequests, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Food alternatives: dietary needs, loading, results, and opening one', async ({ page }) => {
  await control('/v1.2/foods/food-1/alternatives', { delay: 2 })
  await openDemo(page, '/food/food-1?q=pizza')
  await byId(page, 'food-alternatives').click()
  await expect(byId(page, 'alternatives-panel')).toContainText('Instead of Fixture Pizza')
  await byId(page, 'diet-restriction-gluten').click()
  await byId(page, 'diet-restriction-dairy').click()
  await byId(page, 'diet-restriction-dairy').click()
  await byId(page, 'diet-preference-vegan').click()
  await expect(byId(page, 'diet-restriction-gluten')).toHaveAttribute('aria-pressed', 'true')
  await expect(byId(page, 'diet-restriction-dairy')).toHaveAttribute('aria-pressed', 'false')
  await byId(page, 'alternatives-refresh').click()
  await expect(byId(page, 'alternatives-loading')).toBeVisible()
  await expect(byId(page, 'alternatives-results')).toContainText('Suggestions · 2', { timeout: 15_000 })
  await expect(byId(page, 'alternative-1')).toContainText('Fixture Kitchen')
  await expect(byId(page, 'alternatives-refresh')).toHaveText(/Refresh alternatives/)

  const request = (await fixtureRequests()).find(({ path }) => path === '/v1.2/foods/food-1/alternatives')
  expect(request?.body).toEqual({ diet_restrictions: ['gluten'], diet_preferences: ['vegan'] })

  await byId(page, 'alternative-0').click()
  await expect(page).toHaveURL(/\/food\/food-2/)
  await expect(page.getByRole('heading', { name: 'Fixture Salad' })).toBeVisible()
  // The new food starts from its own serving, not the previous food's.
  await expect(byId(page, 'food-serving-unit')).toHaveValue('21')
  await expect(byId(page, 'food-alternatives')).toBeVisible()
})

test('Food alternatives empty, failure, and retry', async ({ page }) => {
  await control('/v1.2/foods/food-1/alternatives', { empty: true })
  await openDemo(page, '/food/food-1?q=pizza')
  await byId(page, 'food-alternatives').click()
  await byId(page, 'alternatives-refresh').click()
  await expect(byId(page, 'alternatives-empty')).toBeVisible()

  await control('/v1.2/foods/food-1/alternatives', { status: 500 })
  await byId(page, 'alternatives-refresh').click()
  await expect(byId(page, 'alternatives-error')).toBeVisible()
  await expect(byId(page, 'alternatives-empty')).toHaveCount(0)
  await control('/v1.2/foods/food-1/alternatives', { status: 200 })
  await byId(page, 'alternatives-error-retry').click()
  await expect(byId(page, 'alternative-0')).toContainText('Fixture Salad')
})
