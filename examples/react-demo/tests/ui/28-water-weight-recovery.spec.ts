import { expect, test } from '@playwright/test'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Water and weight loading empty failure and retry', async ({ page }) => {
  await control('/v1.2/water-logs', { delay: 2 })
  await openDemo(page, '/water-weight')
  await byId(page, 'water-logs-refresh').click()
  await expect(byId(page, 'water-logs-loading')).toBeVisible()
  await expect(byId(page, 'water-total-0')).toBeVisible({ timeout: 15_000 })

  // The demo caches totals per range and unit, so change the range before each reload.
  await control('/v1.2/water-logs', { empty: true })
  await byId(page, 'body-logs-range-week').click()
  await byId(page, 'water-logs-refresh').click()
  await expect(byId(page, 'water-logs-empty')).toBeVisible()

  await control('/v1.2/water-logs', { status: 500 })
  await byId(page, 'body-logs-range-month').click()
  await byId(page, 'water-logs-refresh').click()
  await expect(byId(page, 'water-logs-error')).toBeVisible()
  await byId(page, 'water-log-add').click()
  await expect(byId(page, 'water-log-add-error')).toBeVisible()
  await expect(byId(page, 'water-log-last')).toHaveCount(0)

  await control('/v1.2/water-logs', { status: 200 })
  await byId(page, 'body-logs-range-today').click()
  await byId(page, 'water-logs-refresh').click()
  await expect(byId(page, 'water-total-0')).toBeVisible()
  await expect(byId(page, 'water-logs-error')).toHaveCount(0)

  await control('/v1.2/weight-logs', { empty: true })
  await byId(page, 'weight-logs-refresh').click()
  await expect(byId(page, 'weight-logs-empty')).toBeVisible()
  await control('/v1.2/weight-logs', { status: 500 })
  await byId(page, 'weight-log-add').click()
  await expect(byId(page, 'weight-log-add-error')).toBeVisible()
  await control('/v1.2/weight-logs', { status: 200 })
  await byId(page, 'body-logs-range-week').click()
  await byId(page, 'weight-logs-refresh').click()
  await expect(byId(page, 'weight-day-0')).toBeVisible()
})
