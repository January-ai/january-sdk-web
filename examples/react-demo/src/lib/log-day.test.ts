import assert from 'node:assert/strict'
import test from 'node:test'
import { formatDay, localDate, shiftDay } from './log-day.ts'

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

test('today and yesterday are named, other days are spelled out', () => {
  assert.equal(formatDay('2026-08-25', august25), 'Today')
  assert.equal(formatDay('2026-08-24', august25), 'Yesterday')
  assert.equal(formatDay('2026-08-20', august25), 'Thursday, Aug 20, 2026')
})
