import { expect, test } from '@playwright/test'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Native parity - food log surfaces', async ({ page }) => {
  await openDemo(page, '/food-logs')
  await expect(byId(page, 'food-log-user-card')).toBeVisible()
  await expect(byId(page, 'food-log-0')).toBeVisible()
  await byId(page, 'logs-day-previous').click()
  await expect(byId(page, 'logs-day-label')).toHaveText('Yesterday')
  await expect(byId(page, 'food-log-0')).toBeVisible()
  await byId(page, 'logs-day-next').click()
  await expect(byId(page, 'logs-day-label')).toHaveText('Today')
  await byId(page, 'logs-day-next').click()
  await expect(byId(page, 'logs-day-label')).not.toHaveText('Today')
  await byId(page, 'logs-day-today').click()
  await expect(byId(page, 'logs-day-label')).toHaveText('Today')
  await expect(byId(page, 'food-log-0')).toBeVisible()
  await byId(page, 'food-log-0').getByTestId('food-log-edit').click()
  await expect(page.getByText('Edit meal')).toBeVisible()
})
