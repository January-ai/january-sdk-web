import { expect, test } from '@playwright/test'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Food logs browse and create', async ({ page }) => {
  await openDemo(page, '/food-logs')
  await byId(page, 'food-logs-refresh').click()
  await expect(byId(page, 'food-log-0')).toContainText('Fixture lunch')
  await byId(page, 'food-log-add').click()
  await expect(byId(page, 'food-log-editor')).toBeVisible()
  await expect(page.getByText('Add a meal')).toBeVisible()
  await byId(page, 'food-log-name').fill('Afternoon snack')
  await expect(byId(page, 'food-log-editor-empty')).toBeVisible()
  await byId(page, 'food-picker-input').fill('pizza')
  await byId(page, 'food-log-add-food').click()
  await byId(page, 'food-picker-result-0').click()
  await expect(byId(page, 'food-log-editor-empty')).toHaveCount(0)
  await byId(page, 'food-log-save').click()
  await expect(byId(page, 'food-log-editor')).toHaveCount(0)
  await expect(byId(page, 'food-log-0')).toBeVisible()
})
