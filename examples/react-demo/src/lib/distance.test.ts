import assert from 'node:assert/strict'
import test from 'node:test'
import { formatDistance } from './distance.ts'

test('a distance in meters is shown in miles', () => {
  assert.equal(formatDistance(100), '0.1 mi')
  assert.equal(formatDistance(804.672), '0.5 mi')
  assert.equal(formatDistance(1_609.344), '1.0 mi')
  assert.equal(formatDistance(8_000), '5.0 mi')
  assert.equal(formatDistance(19_312.128), '12 mi')
})
