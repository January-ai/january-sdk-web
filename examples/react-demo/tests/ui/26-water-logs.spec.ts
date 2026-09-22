import { expect, test } from '@playwright/test'
import { byId, control, fixtureRequests, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Water log create totals and delete', async ({ page }) => {
  await openDemo(page, '/water-weight')
  await expect(byId(page, 'water-weight-screen')).toBeVisible()
  await byId(page, 'water-amount').fill('8')
  await byId(page, 'water-unit-fl-oz').click()
  await byId(page, 'water-log-add').click()
  await expect(byId(page, 'water-log-last')).toContainText('Logged 8 fl oz')

  await byId(page, 'water-logs-refresh').click()
  await expect(byId(page, 'water-total-0')).toContainText('24 fl oz')

  await byId(page, 'water-unit-ml').click()
  await byId(page, 'water-logs-refresh').click()
  await expect(byId(page, 'water-total-0')).toContainText('709.8 ml')

  await byId(page, 'water-log-delete').click()
  await expect(byId(page, 'water-log-last')).toHaveCount(0)

  const requests = await fixtureRequests()
  expect(requests.some(({ method, path }) => method === 'POST' && path === '/v1.2/water-logs')).toBe(true)
  expect(requests.filter(({ method, path }) => method === 'GET' && path === '/v1.2/water-logs').map(({ query }) => query.unit).slice(0, 2)).toEqual(['fl_oz', 'ml'])
  expect(requests.some(({ method, path }) => method === 'DELETE' && path === '/v1.2/water-logs/water-1')).toBe(true)
})
