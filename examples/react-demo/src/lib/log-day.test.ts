import assert from 'node:assert/strict'
import test from 'node:test'
import { formatDay, localDate, shiftDay, timestampForDay } from './log-day.ts'

const august25 = new Date(2026, 7, 25, 12)

test('a log day is a local calendar date', () => {
  assert.equal(localDate(august25), '2026-08-25')
  assert.equal(localDate(new Date(2026, 0, 5, 0, 30)), '2026-01-05')
})

test('shifting a day crosses month and year boundaries in local time', () => {
  assert.equal(shiftDay('2026-08-25', 1), '2026-08-26')
  assert.equal(shiftDay('2026-09-01', -1), '2026-08-31')
  assert.equal(shiftDay('2026-01-01', -1), '2025-12-31')
})

test('an entry for today is stamped now, an entry for another day at that day\'s local noon', () => {
  // 9:30 PM local is already the next day in UTC for any timezone west of UTC-2:30.
  const evening = new Date(2026, 7, 25, 21, 30)
  assert.equal(timestampForDay('2026-08-25', evening), evening.toISOString())
  const yesterday = new Date(timestampForDay('2026-08-24', evening))
  assert.equal(localDate(yesterday), '2026-08-24')
  assert.equal(yesterday.getHours(), 12)
  assert.equal(localDate(new Date(timestampForDay('2026-02-28', evening))), '2026-02-28')
})

test('today and yesterday are named, other days are spelled out', () => {
  assert.equal(formatDay('2026-08-25', august25), 'Today')
  assert.equal(formatDay('2026-08-24', august25), 'Yesterday')
  assert.equal(formatDay('2026-08-20', august25), 'Thursday, Aug 20, 2026')
})
