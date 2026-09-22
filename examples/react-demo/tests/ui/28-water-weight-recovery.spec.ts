import { expect, test } from '@playwright/test'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Water and weight loading empty failure and retry', async ({ page }) => {
  await control('/v1.2/water-logs', { delay: 2 })
  await openDemo(page, '/tracking')
  await expect(byId(page, 'water-logs-loading')).toBeVisible()
  await expect(byId(page, 'water-day-total')).toBeVisible({ timeout: 15_000 })

  // Each day is its own query, so move to another day before changing the fixture.
  await control('/v1.2/water-logs', { empty: true })
  await byId(page, 'logs-day-previous').click()
  await expect(byId(page, 'water-logs-empty')).toBeVisible()

  await control('/v1.2/water-logs', { status: 500 })
  await byId(page, 'logs-day-previous').click()
  await expect(byId(page, 'water-logs-error')).toBeVisible()
  await byId(page, 'water-log-add').click()
  await expect(byId(page, 'water-log-add-error')).toBeVisible()
  await expect(byId(page, 'water-log-last')).toHaveCount(0)

  await control('/v1.2/water-logs', { status: 200 })
  await byId(page, 'logs-day-today').click()
  await expect(byId(page, 'water-day-total')).toBeVisible()
  await expect(byId(page, 'water-logs-error')).toHaveCount(0)
  await expect(byId(page, 'water-log-add-error')).toHaveCount(0)

  // Yesterday's weight is already cached from above, so use a day not visited yet.
  await control('/v1.2/weight-logs', { empty: true })
  await byId(page, 'logs-day-next').click()
  await expect(byId(page, 'weight-logs-empty')).toBeVisible()
  await control('/v1.2/weight-logs', { status: 500 })
  await byId(page, 'weight-log-add').click()
  await expect(byId(page, 'weight-log-add-error')).toBeVisible()
  await control('/v1.2/weight-logs', { status: 200 })
  await byId(page, 'logs-day-today').click()
  await expect(byId(page, 'weight-day-value')).toBeVisible()
  await expect(byId(page, 'weight-log-add-error')).toHaveCount(0)
})
