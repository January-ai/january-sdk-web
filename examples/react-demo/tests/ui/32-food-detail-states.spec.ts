import { expect, test } from './fixtures'
import { byId, control, fixtureRequests, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Food detail loading, serving quantity, and glucose loading', async ({ page }) => {
  await control('/v1.2/foods/food-1', { delay: 2 })
  await openDemo(page, '/food/food-1?q=pizza')
  await expect(byId(page, 'food-detail-loading')).toBeVisible()
  await expect(byId(page, 'food-macros')).toContainText('100', { timeout: 15_000 })

  const quantity = byId(page, 'food-serving-controls')
  await quantity.getByRole('button', { name: 'Increase quantity' }).click()
  await expect(quantity).toContainText('1.25')
  await expect(byId(page, 'food-macros')).toContainText('125')
  await quantity.getByRole('button', { name: 'Decrease quantity' }).click()
  await expect(quantity).toContainText('1')

  await control('/v1.2/glucose/predictions', { delay: 2 })
  await byId(page, 'food-check-glucose').click()
  await expect(byId(page, 'food-glucose-loading')).toBeVisible()
  await expect(byId(page, 'food-glucose-result')).toBeVisible({ timeout: 15_000 })
})

test('Food detail predicts glucose for a number of servings, not the amount in the serving unit', async ({ page }) => {
  const lastPrediction = async () => (await fixtureRequests()).filter(({ path }) => path === '/v1.2/glucose/predictions').at(-1)
  await openDemo(page, '/food/food-4?q=yogurt')
  await expect(byId(page, 'food-macros')).toContainText('100', { timeout: 15_000 })
  const quantity = byId(page, 'food-serving-controls')
  await expect(quantity).toHaveText('6')

  // One "6 oz" serving is 1, not 6.
  await byId(page, 'food-check-glucose').click()
  await expect(byId(page, 'food-glucose-result')).toContainText('after 6 oz', { timeout: 15_000 })
  expect((await lastPrediction())?.body.foods).toEqual([{ food_id: 'food-4', serving_id: '41', quantity: 1 }])

  // 0.75 cup of a "0.5 cup" serving is 1.5.
  await byId(page, 'food-serving-unit').selectOption('42')
  await expect(quantity).toHaveText('0.5')
  await quantity.getByRole('button', { name: 'Increase quantity' }).click()
  await expect(quantity).toHaveText('0.75')
  await expect(byId(page, 'food-macros')).toContainText('112.5')
  await byId(page, 'food-check-glucose').click()
  await expect(byId(page, 'food-glucose-result')).toContainText('after 0.75 cup', { timeout: 15_000 })
  expect((await lastPrediction())?.body.foods).toEqual([{ food_id: 'food-4', serving_id: '42', quantity: 1.5 }])
})

test('Food detail failure and retry', async ({ page }) => {
  await control('/v1.2/foods/food-1', { status: 500 })
  await openDemo(page, '/food/food-1?q=pizza')
  await expect(byId(page, 'food-detail-error')).toBeVisible({ timeout: 15_000 })
  await control('/v1.2/foods/food-1', { status: 200 })
  await byId(page, 'food-detail-retry').click()
  await expect(page.getByRole('heading', { name: 'Fixture Pizza' })).toBeVisible()
  await expect(byId(page, 'food-detail-error')).toHaveCount(0)
})
