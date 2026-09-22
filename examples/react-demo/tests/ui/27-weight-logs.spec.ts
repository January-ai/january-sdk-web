import { expect, test } from '@playwright/test'
import { byId, control, fixtureRequests, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Weight log create and day value', async ({ page }) => {
  await openDemo(page, '/food-logs')
  await expect(byId(page, 'weight-day-value')).toContainText('150 lb')
  await byId(page, 'weight-value').fill('150')
  await byId(page, 'weight-unit-lb').click()
  await byId(page, 'weight-log-add').click()
  await expect(byId(page, 'weight-log-last')).toContainText('Logged 150 lb')

  await byId(page, 'logs-day-previous').click()
  await expect(byId(page, 'logs-day-label')).toHaveText('Yesterday')
  await expect(byId(page, 'weight-log-last')).toHaveCount(0)
  await expect(byId(page, 'weight-day-value')).toContainText('150 lb')

  const requests = await fixtureRequests()
  const lists = requests.filter(({ method, path }) => method === 'GET' && path === '/v1.2/weight-logs')
  expect(lists.length).toBeGreaterThanOrEqual(2)
  expect(lists.every(({ query }) => query.start_date === query.end_date && Boolean(query.timezone))).toBe(true)
  expect(requests.some(({ method, path }) => method === 'POST' && path === '/v1.2/weight-logs')).toBe(true)
})
