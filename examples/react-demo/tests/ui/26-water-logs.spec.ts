import { expect, test } from '@playwright/test'
import { byId, control, fixtureRequests, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Water log create day total and delete', async ({ page }) => {
  await openDemo(page, '/tracking')
  await expect(byId(page, 'tracking-meal-0')).toContainText('Fixture lunch')
  await expect(byId(page, 'food-day-totals')).toContainText('100')
  await byId(page, 'tracking-meal-0').getByTestId('tracking-meal-open').click()
  await expect(page.getByText('Edit meal')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(byId(page, 'food-log-editor')).toBeHidden()
  await expect(byId(page, 'water-day-total')).toContainText('24 fl oz')
  await byId(page, 'water-amount').fill('8')
  await byId(page, 'water-unit-fl-oz').click()
  await byId(page, 'water-log-add').click()
  await expect(byId(page, 'water-log-last')).toContainText('Logged 8 fl oz')

  await byId(page, 'water-unit-ml').click()
  await expect(byId(page, 'water-day-total')).toContainText('709.8 ml')

  await byId(page, 'water-unit-cup').click()
  await expect(byId(page, 'water-day-total')).toContainText('3 cup')
  await byId(page, 'water-amount').fill('1.5')
  await byId(page, 'water-log-add').click()
  await expect(byId(page, 'water-log-last')).toContainText('Logged 1.5 cup')

  await byId(page, 'water-log-delete').click()
  await expect(byId(page, 'water-log-last')).toHaveCount(0)

  const requests = await fixtureRequests()
  const lists = requests.filter(({ method, path }) => method === 'GET' && path === '/v1.2/water-logs')
  expect(lists[0]?.query.start_date).toBe(lists[0]?.query.end_date)
  expect(lists.map(({ query }) => query.unit)).toContain('ml')
  expect(lists.map(({ query }) => query.unit)).toContain('cup')
  expect(requests.some(({ method, path }) => method === 'POST' && path === '/v1.2/water-logs')).toBe(true)
  expect(requests.some(({ method, path }) => method === 'DELETE' && path === '/v1.2/water-logs/water-1')).toBe(true)
})
