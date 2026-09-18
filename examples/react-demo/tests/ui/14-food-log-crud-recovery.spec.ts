import { expect, test } from '@playwright/test'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Food log update delete and retry preserve state', async ({ page }) => {
  await openDemo(page, '/food-logs')
  await byId(page, 'food-logs-refresh').click()
  await expect(byId(page, 'food-log-0')).toContainText('Fixture lunch')
  await byId(page, 'food-log-0').getByTestId('food-log-edit').click()
  await expect(byId(page, 'food-log-editor')).toBeVisible()
  await expect(page.getByText('Edit meal')).toBeVisible()
  await byId(page, 'food-log-name').fill('Updated meal')
  await byId(page, 'food-log-save').click()
  await expect(byId(page, 'food-log-editor')).toHaveCount(0)
  await expect(byId(page, 'food-log-0')).toBeVisible()

  await control('/v1.2/food-logs/log-1', { status: 500 })
  await byId(page, 'food-log-0').getByTestId('food-log-delete').click()
  await expect(byId(page, 'food-logs-error')).toBeVisible()
  await expect(byId(page, 'food-log-0')).toBeVisible()

  await control('/v1.2/food-logs/log-1', { status: 200 })
  await control('/v1.2/food-logs', { empty: true })
  await byId(page, 'food-log-0').getByTestId('food-log-delete').click()
  await expect(byId(page, 'food-logs-empty')).toBeVisible()
  await expect(byId(page, 'food-logs-error')).toHaveCount(0)
})
