import { expect, test } from './fixtures'
import { byId, control, fixtureRequests, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

// Fixture Yogurt's primary serving is "6 oz" at 100 kcal. The API reads a logged quantity as a
// number of servings and computes the log's nutrition from it, as the fixture does, so the default
// portion has to be logged as 1: logging the 6 oz amount as the quantity records 600 kcal.
test('A 6 oz portion logged from its detail is one serving: Tracking and Logs show 100 cal, not 600', async ({ page }) => {
  await openDemo(page, '/search?q=yogurt')
  await expect(byId(page, 'food-result-0')).toContainText('Fixture Yogurt', { timeout: 15_000 })
  await byId(page, 'food-result-0').click()
  await expect(byId(page, 'food-detail-screen')).toBeVisible()
  await expect(byId(page, 'food-serving-controls')).toHaveText('6')
  await expect(byId(page, 'food-macros')).toContainText('100 cal')

  await byId(page, 'food-log-portion').click()
  await expect(byId(page, 'food-log-portion-saved')).toContainText('Logged 6 oz')

  await byId(page, 'food-log-portion-view').click()
  await expect(byId(page, 'tracking-screen')).toBeVisible()
  const meal = page.getByTestId(/^tracking-meal-\d+$/).filter({ hasText: 'Fixture Yogurt' })
  await expect(meal).toContainText('100 cal · 1 × 6 oz', { timeout: 15_000 })
  await expect(meal).not.toContainText('600 cal')

  await openDemo(page, '/food-logs')
  await byId(page, 'food-logs-refresh').click()
  const row = page.getByTestId(/^food-log-\d+$/).filter({ hasText: 'Fixture Yogurt' })
  await expect(row).toContainText('100 cal · 1 × 6 oz', { timeout: 15_000 })
  await expect(row).not.toContainText('600 cal')

  // What the demo sent: one serving, not the 6 oz amount.
  const logged = (await fixtureRequests()).find(({ method, path }) => method === 'POST' && path === '/v1.2/food-logs')
  expect(logged?.body.foods).toEqual([{ food_id: 'food-4', serving_id: '41', quantity: 1 }])
})

test('Logging a portion: failure, then loading and success on a second try', async ({ page }) => {
  await openDemo(page, '/food/food-4?q=yogurt')
  await expect(byId(page, 'food-macros')).toContainText('100 cal', { timeout: 15_000 })

  await control('/v1.2/food-logs', { status: 500 })
  await byId(page, 'food-log-portion').click()
  await expect(byId(page, 'food-log-portion-error')).toBeVisible({ timeout: 15_000 })
  await expect(byId(page, 'food-log-portion-saved')).toHaveCount(0)

  await control('/v1.2/food-logs', { status: 200, delay: 2 })
  await byId(page, 'food-log-portion').click()
  await expect(byId(page, 'food-log-portion-loading')).toBeVisible()
  await expect(byId(page, 'food-log-portion-saved')).toBeVisible({ timeout: 15_000 })
  await expect(byId(page, 'food-log-portion-error')).toHaveCount(0)
})
