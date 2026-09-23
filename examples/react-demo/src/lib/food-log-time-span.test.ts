import assert from 'node:assert/strict'
import test from 'node:test'
import { FoodLogTimeSpan, resolveFoodLogTimeSpan } from './food-log-time-span.ts'

const august25 = new Date(Date.UTC(2026, 7, 25, 12))

test('food-log spans use calendar boundaries in the user’s timezone', () => {
  assert.deepEqual(pick(resolveFoodLogTimeSpan(FoodLogTimeSpan.today, 'UTC', august25)), { start: '2026-08-25', end: '2026-08-25', display: 'Aug 25, 2026' })
  assert.deepEqual(pick(resolveFoodLogTimeSpan(FoodLogTimeSpan.thisWeek, 'UTC', august25)), { start: '2026-08-23', end: '2026-08-29', display: 'Aug 23, 2026 – Aug 29, 2026' })
  assert.deepEqual(pick(resolveFoodLogTimeSpan(FoodLogTimeSpan.lastMonth, 'UTC', august25)), { start: '2026-07-01', end: '2026-07-31', display: 'Jul 1, 2026 – Jul 31, 2026' })
})

test('the user’s timezone decides which day and month it is', () => {
  // 7 PM on Aug 31 in Los Angeles is Sep 1 in UTC.
  const laEvening = new Date(Date.UTC(2026, 8, 1, 2))
  assert.equal(resolveFoodLogTimeSpan(FoodLogTimeSpan.today, 'America/Los_Angeles', laEvening).start, '2026-08-31')
  assert.equal(resolveFoodLogTimeSpan(FoodLogTimeSpan.lastMonth, 'America/Los_Angeles', laEvening).start, '2026-07-01')
  assert.equal(resolveFoodLogTimeSpan(FoodLogTimeSpan.lastMonth, 'UTC', laEvening).start, '2026-08-01')
})

test('last month crosses a year boundary', () => {
  assert.deepEqual(pick(resolveFoodLogTimeSpan(FoodLogTimeSpan.lastMonth, 'UTC', new Date(Date.UTC(2026, 0, 5, 12)))), { start: '2025-12-01', end: '2025-12-31', display: 'Dec 1, 2025 – Dec 31, 2025' })
})

function pick(range: { start: string; end: string; display: string }) {
  return { start: range.start, end: range.end, display: range.display }
}
