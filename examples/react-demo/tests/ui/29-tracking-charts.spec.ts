import { expect, test } from '@playwright/test'
import { byId, control, fixtureRequests, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

/** Whole days from `start` to `end`, inclusive, for local `YYYY-MM-DD` dates. */
function inclusiveDays(start: string, end: string) {
  const noon = (day: string) => { const [y, m, d] = day.split('-').map(Number); return new Date(y!, m! - 1, d!, 12).getTime() }
  return Math.round((noon(end) - noon(start)) / 86_400_000) + 1
}

async function rangeLists(path: string) {
  const requests = await fixtureRequests()
  return requests.filter((request) => request.method === 'GET' && request.path === path && request.query.start_date !== request.query.end_date)
}

test('Tracking charts week month year and units', async ({ page }) => {
  await openDemo(page, '/tracking')

  // Week: the fixture logs weight on 5 of the last 7 days and water on 6, today's weight 150 lb.
  const weight = byId(page, 'weight-chart')
  const water = byId(page, 'water-chart')
  await expect(weight).toHaveAttribute('data-range', 'week')
  await expect(weight).toHaveAttribute('data-count', '5')
  await expect(byId(page, 'weight-chart-latest')).toHaveText('150 lb')
  await expect(weight.getByRole('group')).toHaveAttribute('aria-label', /^Weight, last 7 days: 5 entries, from [\d.]+ lb to 150 lb/)
  await expect(byId(page, 'weight-chart-range-week')).toHaveAttribute('aria-pressed', 'true')
  await expect(byId(page, 'weight-chart-range-month')).toHaveAttribute('aria-pressed', 'false')
  await expect(water).toHaveAttribute('data-range', 'week')
  await expect(water).toHaveAttribute('data-slots', '7')
  await expect(water).toHaveAttribute('data-count', '6')
  await expect(water.getByRole('group')).toHaveAttribute('aria-label', /^Water, last 7 days: 6 of 7 days logged/)

  const weekLists = await rangeLists('/v1.2/weight-logs')
  expect(weekLists).toHaveLength(1)
  expect(inclusiveDays(weekLists[0]!.query.start_date!, weekLists[0]!.query.end_date!)).toBe(7)
  expect(weekLists[0]!.query.timezone).toBeTruthy()

  // Month: 30 daily slots, missing days stay empty.
  await byId(page, 'weight-chart-range-month').click()
  await expect(byId(page, 'weight-chart-range-month')).toHaveAttribute('aria-pressed', 'true')
  await expect(weight).toHaveAttribute('data-range', 'month')
  await expect(weight).toHaveAttribute('data-count', '20')
  await byId(page, 'water-chart-range-month').click()
  await expect(water).toHaveAttribute('data-range', 'month')
  await expect(water).toHaveAttribute('data-slots', '30')
  await expect(water).toHaveAttribute('data-count', '26')

  // Year: 12 monthly bars, and each chart asks in consecutive chunks of at most 90 days.
  await resetFixture()
  await byId(page, 'weight-chart-range-year').click()
  await expect(weight).toHaveAttribute('data-range', 'year')
  await byId(page, 'water-chart-range-year').click()
  await expect(water).toHaveAttribute('data-range', 'year')
  await expect(water).toHaveAttribute('data-slots', '12')
  await expect(water).toHaveAttribute('data-count', '12')
  for (const path of ['/v1.2/weight-logs', '/v1.2/water-logs']) {
    const chunks = (await rangeLists(path)).map(({ query }) => ({ start: query.start_date!, end: query.end_date! }))
      .sort((a, b) => a.start.localeCompare(b.start))
    expect(chunks.length).toBeGreaterThanOrEqual(4)
    expect(chunks.length).toBeLessThanOrEqual(5)
    expect(chunks[0]!.start.endsWith('-01')).toBe(true)
    chunks.forEach((chunk, index) => {
      expect(inclusiveDays(chunk.start, chunk.end)).toBeLessThanOrEqual(90)
      if (index > 0) expect(inclusiveDays(chunks[index - 1]!.end, chunk.start)).toBe(2)
    })
  }

  // Weights convert for display; water asks again in the new unit.
  await byId(page, 'weight-chart-range-week').click()
  await expect(weight).toHaveAttribute('data-range', 'week')
  await byId(page, 'weight-unit-kg').click()
  await expect(weight).toHaveAttribute('data-unit', 'kg')
  await expect(byId(page, 'weight-chart-latest')).toHaveText('68 kg')
  await byId(page, 'water-chart-range-week').click()
  await byId(page, 'water-unit-cup').click()
  await expect(water).toHaveAttribute('data-unit', 'cup')
  await expect(water).toHaveAttribute('data-range', 'week')
  expect((await rangeLists('/v1.2/water-logs')).some(({ query }) => query.unit === 'cup')).toBe(true)

  // Logging refreshes the charts.
  await resetFixture()
  await byId(page, 'water-amount').fill('1')
  await byId(page, 'water-log-add').click()
  await expect(byId(page, 'water-log-last')).toBeVisible()
  await expect.poll(async () => (await rangeLists('/v1.2/water-logs')).length).toBeGreaterThan(0)
  await byId(page, 'weight-log-add').click()
  await expect(byId(page, 'weight-log-last')).toBeVisible()
  await expect.poll(async () => (await rangeLists('/v1.2/weight-logs')).length).toBeGreaterThan(0)
})

test('Tracking charts empty failure and retry', async ({ page }) => {
  await control('/v1.2/water-logs', { empty: true })
  await control('/v1.2/weight-logs', { empty: true })
  await openDemo(page, '/tracking')
  await expect(byId(page, 'weight-chart-empty')).toHaveText('No weight logged in this range')
  await expect(byId(page, 'water-chart-empty')).toHaveText('No water logged in this range')
  await byId(page, 'water-chart-range-year').click()
  await expect(byId(page, 'water-chart-empty')).toBeVisible()
  await expect(byId(page, 'water-chart')).toHaveCount(0)

  await control('/v1.2/weight-logs', { status: 500 })
  await byId(page, 'weight-chart-range-month').click()
  await expect(byId(page, 'weight-chart-error')).toBeVisible({ timeout: 15_000 })
  await control('/v1.2/weight-logs', { status: 200, empty: false })
  await byId(page, 'weight-chart-retry').click()
  await expect(byId(page, 'weight-chart')).toHaveAttribute('data-range', 'month')
  await expect(byId(page, 'weight-chart-error')).toHaveCount(0)
})
