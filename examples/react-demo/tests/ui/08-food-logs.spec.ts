import { expect, test } from '@playwright/test'
import { byId, control, fixtureRequests, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Food logs browse and create', async ({ page }) => {
  await openDemo(page, '/food-logs')
  await expect(byId(page, 'logs-day-label')).toHaveText('Today')
  await expect(byId(page, 'food-log-0')).toContainText('Fixture lunch')
  await expect(byId(page, 'food-day-totals')).toContainText('100')
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
  await expect(byId(page, 'food-log-editor')).toBeHidden()
  await expect(byId(page, 'food-log-0')).toBeVisible()

  const requests = await fixtureRequests()
  const listed = requests.find(({ method, path }) => method === 'GET' && path === '/v1.2/food-logs')
  expect(listed?.query.start_date).toBe(listed?.query.end_date)
  expect(requests.some(({ path }) => path === '/v1.2/food-logs/summary')).toBe(true)
})
