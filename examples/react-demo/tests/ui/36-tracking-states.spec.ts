import { expect, test } from '@playwright/test'
import { byId, control, fixtureRequests, localDay, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

/** Local noon of `day`, the time the demo stamps on an entry for a day other than today. */
const noonOf = (day: string) => {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year!, month! - 1, date!, 12).getTime()
}

test('Tracking asks for a user first, then scopes every log to the one saved', async ({ page }) => {
  await openDemo(page, '/tracking')
  await expect(byId(page, 'settings-user-id')).toContainText('fixture-user')
  await byId(page, 'settings-clear').click()
  await expect(byId(page, 'tracking-prompt')).toBeVisible()
  await expect(byId(page, 'settings-user-id')).toHaveCount(0)
  await expect(byId(page, 'tracking-meal-add')).toBeDisabled()
  await expect(byId(page, 'water-log-add')).toBeDisabled()
  await expect(byId(page, 'logs-day-refresh')).toBeDisabled()

  await byId(page, 'settings-user-input').fill('fixture-user')
  await byId(page, 'settings-timezone-input').fill('America/Chicago')
  await byId(page, 'settings-save').click()
  await expect(byId(page, 'settings-user-id')).toHaveText('fixture-user · America/Chicago')
  await expect(byId(page, 'tracking-meal-list')).toBeVisible()
  const lists = (await fixtureRequests()).filter(({ method, path }) => method === 'GET' && path === '/v1.2/food-logs')
  expect(lists.at(-1)?.query.timezone).toBe('America/Chicago')
})

test('Meals loading, delete failure, delete, empty day, and a failed day', async ({ page }) => {
  await control('/v1.2/food-logs', { delay: 2 })
  await openDemo(page, '/tracking')
  await expect(byId(page, 'logs-day-card')).toBeVisible()
  await expect(byId(page, 'tracking-meals-loading')).toBeVisible()
  await expect(byId(page, 'tracking-meal-list')).toBeVisible({ timeout: 15_000 })
  await expect(byId(page, 'food-section')).toContainText('1 logged meal')

  await control('/v1.2/food-logs/log-1', { status: 500 })
  await byId(page, 'tracking-meal-0').getByTestId('tracking-meal-delete').click()
  await expect(byId(page, 'tracking-meal-delete-error')).toBeVisible()
  await expect(byId(page, 'tracking-meal-0')).toBeVisible()

  await control('/v1.2/food-logs/log-1', { status: 200 })
  await control('/v1.2/food-logs', { empty: true })
  await control('/v1.2/food-logs/summary', { empty: true })
  await byId(page, 'tracking-meal-0').getByTestId('tracking-meal-delete').click()
  await expect(byId(page, 'tracking-meals-empty')).toBeVisible()
  await expect(byId(page, 'tracking-meal-delete-error')).toHaveCount(0)
  expect((await fixtureRequests()).filter(({ method, path }) => method === 'DELETE' && path === '/v1.2/food-logs/log-1')).toHaveLength(2)

  await control('/v1.2/food-logs', { status: 500 })
  await control('/v1.2/food-logs/summary', { status: 500 })
  await byId(page, 'logs-day-previous').click()
  await expect(byId(page, 'tracking-meals-error')).toBeVisible({ timeout: 15_000 })
  await expect(byId(page, 'food-day-totals-error')).toBeVisible()

  await control('/v1.2/food-logs', { status: 200 })
  await control('/v1.2/food-logs/summary', { status: 200 })
  await byId(page, 'logs-day-refresh').click()
  await expect(byId(page, 'tracking-meal-list')).toBeVisible()
  await expect(byId(page, 'food-day-totals')).toContainText('100')
})

test('An entry logged while viewing an earlier day lands on that day', async ({ page }) => {
  const yesterday = localDay(-1)
  await openDemo(page, '/tracking')
  await byId(page, 'logs-day-previous').click()
  await expect(byId(page, 'logs-day-label')).toHaveText('Yesterday')
  await expect(byId(page, 'logs-day-input')).toHaveValue(yesterday)

  await byId(page, 'tracking-meal-add').click()
  await expect(byId(page, 'food-log-time')).toHaveValue(`${yesterday}T12:00`)
  await byId(page, 'food-picker-input').fill('pizza')
  await byId(page, 'food-log-add-food').click()
  await byId(page, 'food-picker-result-0').click()
  await byId(page, 'food-log-save').click()
  await expect(byId(page, 'food-log-editor')).toBeHidden()

  await byId(page, 'water-amount').fill('12')
  await byId(page, 'water-log-add').click()
  await expect(byId(page, 'water-log-last')).toContainText('Logged 12 fl oz on')
  await byId(page, 'weight-value').fill('151.5')
  await byId(page, 'weight-log-add').click()
  await expect(byId(page, 'weight-log-last')).toContainText('Logged 151.5 lb on')

  const requests = await fixtureRequests()
  const meal = requests.find(({ method, path }) => method === 'POST' && path === '/v1.2/food-logs')
  const water = requests.find(({ method, path }) => method === 'POST' && path === '/v1.2/water-logs')
  const weight = requests.find(({ method, path }) => method === 'POST' && path === '/v1.2/weight-logs')
  expect(new Date(meal?.body.eaten_at).getTime()).toBe(noonOf(yesterday))
  expect(new Date(water?.body.consumed_at).getTime()).toBe(noonOf(yesterday))
  expect(water?.body.amount).toEqual({ value: 12, unit: 'fl_oz' })
  expect(new Date(weight?.body.measured_at).getTime()).toBe(noonOf(yesterday))
  expect(weight?.body.weight).toEqual({ value: 151.5, unit: 'lb' })

  // Today is stamped now.
  await byId(page, 'logs-day-today').click()
  await expect(byId(page, 'logs-day-today')).toBeDisabled()
  await byId(page, 'water-log-add').click()
  await expect(byId(page, 'water-log-last')).toContainText('Logged 12 fl oz at')
  const today = (await fixtureRequests()).filter(({ method, path }) => method === 'POST' && path === '/v1.2/water-logs').at(-1)
  expect(Math.abs(new Date(today?.body.consumed_at).getTime() - Date.now())).toBeLessThan(60_000)
})

test('Water delete failure, weight loading, and a failed weight day', async ({ page }) => {
  await control('/v1.2/weight-logs', { delay: 2 })
  await openDemo(page, '/tracking')
  await expect(byId(page, 'weight-section')).toBeVisible()
  await expect(byId(page, 'weight-logs-loading')).toBeVisible()
  await expect(byId(page, 'weight-day-value')).toContainText('150 lb', { timeout: 15_000 })

  await expect(byId(page, 'water-section')).toBeVisible()
  await byId(page, 'water-log-add').click()
  await expect(byId(page, 'water-log-last')).toBeVisible()
  await control('/v1.2/water-logs/water-1', { status: 500 })
  await byId(page, 'water-log-delete').click()
  await expect(byId(page, 'water-log-delete-error')).toBeVisible()
  await expect(byId(page, 'water-log-last')).toBeVisible()

  await control('/v1.2/weight-logs', { status: 500 })
  await byId(page, 'logs-day-previous').click()
  await expect(byId(page, 'weight-logs-error')).toBeVisible({ timeout: 15_000 })
  await expect(byId(page, 'weight-logs-error-details-body')).toHaveText('The test request could not be completed.')
})
