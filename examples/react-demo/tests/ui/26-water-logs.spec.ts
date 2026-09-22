import { expect, test } from '@playwright/test'
import { byId, control, fixtureRequests, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Water log create day total and delete', async ({ page }) => {
  await openDemo(page, '/food-logs')
  await expect(byId(page, 'water-day-total')).toContainText('24 fl oz')
  await byId(page, 'water-amount').fill('8')
  await byId(page, 'water-unit-fl-oz').click()
  await byId(page, 'water-log-add').click()
  await expect(byId(page, 'water-log-last')).toContainText('Logged 8 fl oz')

  await byId(page, 'water-unit-ml').click()
  await expect(byId(page, 'water-day-total')).toContainText('709.8 ml')

  await byId(page, 'water-log-delete').click()
  await expect(byId(page, 'water-log-last')).toHaveCount(0)

  const requests = await fixtureRequests()
  const lists = requests.filter(({ method, path }) => method === 'GET' && path === '/v1.2/water-logs')
  expect(lists[0]?.query.start_date).toBe(lists[0]?.query.end_date)
  expect(lists.map(({ query }) => query.unit)).toContain('ml')
  expect(requests.some(({ method, path }) => method === 'POST' && path === '/v1.2/water-logs')).toBe(true)
  expect(requests.some(({ method, path }) => method === 'DELETE' && path === '/v1.2/water-logs/water-1')).toBe(true)
})
