import assert from 'node:assert/strict'
import test from 'node:test'
import { dayIn, formatDay, shiftDay, timestampForDay, todayIn } from './log-day.ts'

// 9:30 PM on Aug 25 in New York is already Aug 26 in UTC and in Tokyo.
const newYorkEvening = new Date(Date.UTC(2026, 7, 26, 1, 30))

test('a log day is the calendar date in the end user’s timezone, not the browser’s', () => {
  assert.equal(dayIn(newYorkEvening, 'America/New_York'), '2026-08-25')
  assert.equal(dayIn(newYorkEvening, 'UTC'), '2026-08-26')
  assert.equal(todayIn('Asia/Tokyo', newYorkEvening), '2026-08-26')
})

test('an unknown timezone name falls back to the browser’s instead of throwing', () => {
  assert.match(todayIn('Not/AZone', newYorkEvening), /^\d{4}-\d{2}-\d{2}$/)
})

test('shifting a day crosses month and year boundaries', () => {
  assert.equal(shiftDay('2026-08-25', 1), '2026-08-26')
  assert.equal(shiftDay('2026-09-01', -1), '2026-08-31')
  assert.equal(shiftDay('2026-01-01', -1), '2025-12-31')
  assert.equal(shiftDay('2028-02-28', 1), '2028-02-29')
})

test('an entry for today is stamped now, an entry for another day at noon in the user’s timezone', () => {
  assert.equal(timestampForDay('2026-08-25', 'America/New_York', newYorkEvening), newYorkEvening.toISOString())
  assert.equal(timestampForDay('2026-08-24', 'America/New_York', newYorkEvening), '2026-08-24T16:00:00.000Z')
  assert.equal(timestampForDay('2026-08-25', 'Asia/Tokyo', newYorkEvening), '2026-08-25T03:00:00.000Z')
  // Noon keeps the zone's offset on either side of a daylight-saving change.
  assert.equal(timestampForDay('2026-03-08', 'America/New_York', newYorkEvening), '2026-03-08T16:00:00.000Z')
  assert.equal(timestampForDay('2026-11-01', 'America/New_York', newYorkEvening), '2026-11-01T17:00:00.000Z')
})

test('today and yesterday are named in the user’s timezone, other days are spelled out', () => {
  assert.equal(formatDay('2026-08-25', 'America/New_York', newYorkEvening), 'Today')
  assert.equal(formatDay('2026-08-25', 'Asia/Tokyo', newYorkEvening), 'Yesterday')
  assert.equal(formatDay('2026-08-20', 'America/New_York', newYorkEvening), 'Thursday, Aug 20, 2026')
})
