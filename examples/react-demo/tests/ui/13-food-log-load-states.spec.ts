import { expect, test } from '@playwright/test'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Food logs loading empty failure and retry', async ({ page }) => {
  await control('/v1.2/food-logs', { delay: 2 })
  await openDemo(page, '/food-logs')
  await expect(byId(page, 'food-logs-loading')).toBeVisible()
  await expect(byId(page, 'food-log-0')).toContainText('Fixture lunch', { timeout: 15_000 })
  // Each day is its own query, so move to another day before changing the fixture.
  await control('/v1.2/food-logs', { empty: true })
  await byId(page, 'logs-day-previous').click()
  await expect(byId(page, 'logs-day-label')).toHaveText('Yesterday')
  await expect(byId(page, 'food-logs-empty')).toBeVisible()
  await expect(page.getByText('No food logs found')).toBeVisible()

  await control('/v1.2/food-logs', { status: 500 })
  await byId(page, 'logs-day-previous').click()
  await expect(byId(page, 'food-logs-error')).toBeVisible()

  await control('/v1.2/food-logs', { status: 200 })
  await byId(page, 'logs-day-today').click()
  await expect(byId(page, 'logs-day-label')).toHaveText('Today')
  await byId(page, 'food-logs-refresh').click()
  await expect(byId(page, 'food-log-0')).toBeVisible()
  await expect(byId(page, 'food-logs-error')).toHaveCount(0)
})
