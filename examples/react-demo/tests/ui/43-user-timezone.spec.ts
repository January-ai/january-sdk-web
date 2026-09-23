import { expect, test } from './fixtures'
import { byId, fixtureRequests, openDemo, resetFixture } from './flow'

// The browser runs 25 hours behind the user, so their calendar days never match.
test.use({ timezoneId: 'Pacific/Pago_Pago' })

const userZone = 'Pacific/Kiritimati'
const dayIn = (timeZone: string, offsetDays = 0) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
  .format(new Date(Date.now() + offsetDays * 86_400_000))

test.beforeEach(async () => {
  await resetFixture()
})

test('Tracking and Logs use the user’s timezone for today, not the browser’s', async ({ page }) => {
  await openDemo(page, '/tracking')
  await expect(byId(page, 'settings-user-id')).toContainText('fixture-user')
  await byId(page, 'settings-timezone-input').fill(userZone)
  await byId(page, 'settings-save').click()
  await expect(byId(page, 'settings-user-id')).toContainText(userZone)

  const today = dayIn(userZone)
  expect(today).not.toBe(dayIn('Pacific/Pago_Pago'))
  await expect(byId(page, 'logs-day-input')).toHaveValue(today)
  await expect(byId(page, 'logs-day-label')).toHaveText('Today')
  await expect.poll(async () => (await fixtureRequests()).some(({ path, query }) =>
    path === '/v1.2/water-logs' && query.start_date === today && query.end_date === today && query.timezone === userZone)).toBe(true)

  // Yesterday's entry is stamped at noon on the user's clock, so the API files it under that day.
  await byId(page, 'logs-day-previous').click()
  await expect(byId(page, 'logs-day-label')).toHaveText('Yesterday')
  await byId(page, 'water-amount').fill('8')
  await byId(page, 'water-log-add').click()
  await expect(byId(page, 'water-log-last')).toBeVisible()
  const water = (await fixtureRequests()).find(({ method, path }) => method === 'POST' && path === '/v1.2/water-logs')
  const consumedAt = new Date(water?.body?.consumed_at)
  expect(new Intl.DateTimeFormat('en-CA', { timeZone: userZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(consumedAt)).toBe(dayIn(userZone, -1))
  expect(new Intl.DateTimeFormat('en-US', { timeZone: userZone, hour: 'numeric', hourCycle: 'h23' }).format(consumedAt)).toBe('12')

  await openDemo(page, '/food-logs')
  await byId(page, 'food-logs-refresh').click()
  await expect.poll(async () => (await fixtureRequests()).some(({ method, path, query }) =>
    method === 'GET' && path === '/v1.2/food-logs' && query.start_date === today && query.timezone === userZone)).toBe(true)
})
