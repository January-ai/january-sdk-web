import { expect, test } from './fixtures'
import { byId, control, fixtureRequests, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

// The live API does not accept the US cup yet: listing or logging water in `cup` answers
// 400 invalid_request. The demo keeps the unit and shows the API's message on the day
// total, the chart, and the log action, and fl oz and ml keep working.
const rejection = 'unit is required: fl_oz or ml — the unit every daily total is returned in.'

test('Water in cups rejected by the API is shown clearly and nothing breaks', async ({ page }) => {
  await control('/v1.2/water-logs', { status: 400, code: 'invalid_request', message: rejection, when: 'unit=cup' })
  await openDemo(page, '/tracking')
  await expect(byId(page, 'water-day-total')).toHaveText('24 fl oz')

  await byId(page, 'water-unit-cup').click()
  await expect(byId(page, 'water-logs-error-details-body')).toHaveText(rejection, { timeout: 15_000 })
  await expect(byId(page, 'water-chart-error-details-body')).toHaveText(rejection)
  await byId(page, 'water-amount').fill('1')
  await byId(page, 'water-log-add').click()
  await expect(byId(page, 'water-log-add-error-details-body')).toHaveText(rejection)
  await expect(byId(page, 'water-log-last')).toHaveCount(0)
  const posted = (await fixtureRequests()).filter(({ method, path }) => method === 'POST' && path === '/v1.2/water-logs')
  expect(posted.map(({ body }) => body.amount)).toEqual([{ value: 1, unit: 'cup' }])

  await byId(page, 'water-unit-fl-oz').click()
  await expect(byId(page, 'water-log-add-error')).toHaveCount(0)
  await expect(byId(page, 'water-day-total')).toHaveText('24 fl oz')
  await expect(byId(page, 'water-chart')).toHaveAttribute('data-unit', 'fl oz')
  await byId(page, 'water-amount').fill('8')
  await byId(page, 'water-log-add').click()
  await expect(byId(page, 'water-log-last')).toContainText('Logged 8 fl oz')
  await byId(page, 'water-unit-ml').click()
  await expect(byId(page, 'water-day-total')).toHaveText('709.8 ml')
})
