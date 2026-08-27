import assert from 'node:assert/strict'
import test from 'node:test'
import { kilogramsToPounds, poundsToKilograms } from './weight-units.ts'

test('metric weight presentation round-trips to API pounds', () => {
  const kilograms = poundsToKilograms(150)
  assert.ok(Math.abs(kilograms - 68.0388555) < 0.001)
  assert.ok(Math.abs(kilogramsToPounds(kilograms) - 150) < 0.001)
})
