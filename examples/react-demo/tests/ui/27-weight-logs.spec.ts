import { expect, test } from '@playwright/test'
import { byId, control, fixtureRequests, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Weight log create and daily list', async ({ page }) => {
  await openDemo(page, '/water-weight')
  await byId(page, 'weight-value').fill('150')
  await byId(page, 'weight-unit-lb').click()
  await byId(page, 'weight-log-add').click()
  await expect(byId(page, 'weight-log-last')).toContainText('Logged 150 lb')

  await byId(page, 'body-logs-range-week').click()
  await byId(page, 'weight-logs-refresh').click()
  await expect(byId(page, 'weight-day-0')).toContainText('150 lb')

  const requests = await fixtureRequests()
  const listed = requests.find(({ method, path }) => method === 'GET' && path === '/v1.2/weight-logs')
  expect(listed?.query.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(listed?.query.timezone).toBeTruthy()
  expect(requests.some(({ method, path }) => method === 'POST' && path === '/v1.2/weight-logs')).toBe(true)
})
