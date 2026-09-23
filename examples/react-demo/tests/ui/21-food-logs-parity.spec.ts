import { expect, test } from './fixtures'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Native parity - food log surfaces', async ({ page }) => {
  await openDemo(page, '/food-logs')
  await expect(byId(page, 'food-log-user-card')).toBeVisible()
  await byId(page, 'logs-range-month').click()
  await byId(page, 'food-logs-refresh').click()
  await expect(byId(page, 'food-log-0')).toBeVisible()
  await byId(page, 'logs-range-week').click()
  await byId(page, 'food-logs-refresh').click()
  await expect(byId(page, 'food-log-0')).toBeVisible()
  await byId(page, 'logs-range-today').click()
  await byId(page, 'food-logs-refresh').click()
  await expect(byId(page, 'food-log-0')).toBeVisible()
  await byId(page, 'food-log-0').getByTestId('food-log-edit').click()
  await expect(page.getByText('Edit meal')).toBeVisible()
})
