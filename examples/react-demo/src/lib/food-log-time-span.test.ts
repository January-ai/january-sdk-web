import assert from 'node:assert/strict'
import test from 'node:test'
import { FoodLogTimeSpan, resolveFoodLogTimeSpan } from './food-log-time-span.ts'

const august25 = new Date(2026, 7, 25, 12)

test('food-log spans use local calendar boundaries', () => {
  assert.deepEqual(pick(resolveFoodLogTimeSpan(FoodLogTimeSpan.today, august25)), { start: '2026-08-25', end: '2026-08-25' })
  assert.deepEqual(pick(resolveFoodLogTimeSpan(FoodLogTimeSpan.thisWeek, august25)), { start: '2026-08-23', end: '2026-08-29' })
  assert.deepEqual(pick(resolveFoodLogTimeSpan(FoodLogTimeSpan.lastMonth, august25)), { start: '2026-07-01', end: '2026-07-31' })
})

test('last month crosses a year boundary', () => {
  assert.deepEqual(pick(resolveFoodLogTimeSpan(FoodLogTimeSpan.lastMonth, new Date(2026, 0, 5, 12))), { start: '2025-12-01', end: '2025-12-31' })
})

function pick(range: { start: string; end: string }) {
  return { start: range.start, end: range.end }
}
