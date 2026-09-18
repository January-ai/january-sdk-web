import { expect, test } from '@playwright/test'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Food logs loading empty failure and retry', async ({ page }) => {
  await openDemo(page, '/food-logs')
  await byId(page, 'food-logs-refresh').click()
  await expect(byId(page, 'food-log-0')).toContainText('Fixture lunch')
  await control('/v1.2/food-logs', { empty: true })
  await byId(page, 'food-logs-refresh').click()
  await expect(byId(page, 'food-logs-empty')).toBeVisible()
  await expect(page.getByText('No food logs found')).toBeVisible()

  await control('/v1.2/food-logs', { status: 500 })
  await byId(page, 'food-logs-refresh').click()
  await expect(byId(page, 'food-logs-error')).toBeVisible()

  await control('/v1.2/food-logs', { status: 200 })
  await byId(page, 'food-logs-refresh').click()
  await expect(byId(page, 'food-log-0')).toBeVisible()
  await expect(byId(page, 'food-logs-error')).toHaveCount(0)
})
