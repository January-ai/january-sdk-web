import assert from 'node:assert/strict'
import test from 'node:test'
import {
  centimetersToInches,
  heightInchesToFeetAndInches,
  inchesToCentimeters,
} from './height-units.ts'

test('total inches are presented as feet and inches', () => {
  assert.deepEqual(heightInchesToFeetAndInches(66), { feet: 5, inches: 6 })
  assert.deepEqual(heightInchesToFeetAndInches(71.6), { feet: 6, inches: 0 })
})

test('metric presentation round-trips to API inches', () => {
  const centimeters = inchesToCentimeters(66)
  assert.ok(Math.abs(centimeters - 167.64) < 0.001)
  assert.ok(Math.abs(centimetersToInches(centimeters) - 66) < 0.001)
})
