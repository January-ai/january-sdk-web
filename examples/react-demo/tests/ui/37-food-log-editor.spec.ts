import { expect, test } from './fixtures'
import { byId, control, fixtureRequests, localDay, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Logs prompt, meal list, and editing the foods of a meal', async ({ page }) => {
  await openDemo(page, '/food-logs')
  await expect(byId(page, 'food-logs-prompt')).toBeVisible()
  await byId(page, 'food-logs-refresh').click()
  await expect(byId(page, 'food-log-list')).toBeVisible()
  await byId(page, 'food-log-0').getByTestId('food-log-edit').click()

  const food = byId(page, 'food-log-food-0')
  await expect(food).toContainText('Fixture Pizza')
  await expect(food.getByTestId('food-log-food-serving')).toHaveValue('11')
  await food.getByTestId('food-log-food-serving').selectOption('11')
  await food.getByTestId('food-log-food-quantity').fill('2')
  await byId(page, 'food-log-time').fill(`${localDay()}T08:30`)
  await byId(page, 'food-log-save').click()
  await expect(byId(page, 'food-log-editor')).toBeHidden()

  const update = (await fixtureRequests()).find(({ method, path }) => method === 'PATCH' && path === '/v1.2/food-logs/log-1')
  expect(update?.body.foods).toEqual([{ food_id: 'food-1', serving_id: '11', quantity: 2 }])
  const [year, month, date] = localDay().split('-').map(Number)
  expect(new Date(update?.body.created_at).getTime()).toBe(new Date(year!, month! - 1, date!, 8, 30).getTime())
})

test('Saving a meal: suggestions, loading, failure, and a fresh editor for the next meal', async ({ page }) => {
  await openDemo(page, '/food-logs')
  await byId(page, 'food-log-add').click()
  await byId(page, 'food-log-name').fill('Brunch')
  await byId(page, 'food-picker-input').fill('pi')
  await expect(byId(page, 'food-picker-suggestions')).toBeVisible()
  await control('/v1.2/foods', { delay: 2 })
  await byId(page, 'food-picker-suggestion-0').click()
  await expect(byId(page, 'food-picker-input')).toHaveValue('Fixture Pizza')
  await expect(byId(page, 'food-picker-loading')).toBeVisible()
  await expect(byId(page, 'food-picker-results')).toBeVisible({ timeout: 15_000 })
  await byId(page, 'food-picker-result-0').click()
  await expect(byId(page, 'food-log-food-0')).toBeVisible()

  await byId(page, 'food-log-food-0').getByTestId('food-log-food-remove').click()
  await expect(byId(page, 'food-log-editor-empty')).toBeVisible()
  await expect(byId(page, 'food-log-save')).toBeDisabled()
  await byId(page, 'food-picker-result-0').click()

  await control('/v1.2/food-logs', { status: 500 })
  await byId(page, 'food-log-save').click()
  await expect(byId(page, 'food-log-save-error')).toBeVisible()
  await expect(byId(page, 'food-log-food-0')).toBeVisible()

  await control('/v1.2/food-logs', { delay: 2 })
  await byId(page, 'food-log-save').click()
  await expect(byId(page, 'food-log-save-loading')).toBeVisible()
  await expect(byId(page, 'food-log-editor')).toBeHidden({ timeout: 15_000 })
  const create = (await fixtureRequests()).filter(({ method, path }) => method === 'POST' && path === '/v1.2/food-logs').at(-1)
  expect(create?.body).toMatchObject({ name: 'Brunch', foods: [{ food_id: 'food-1', serving_id: '11', quantity: 1 }] })

  // The next meal starts empty rather than from the one just saved.
  await byId(page, 'food-log-add').click()
  await expect(byId(page, 'food-log-editor-empty')).toBeVisible()
  await expect(byId(page, 'food-log-name')).toHaveValue('')
  await expect(byId(page, 'food-log-food-0')).toHaveCount(0)
})
