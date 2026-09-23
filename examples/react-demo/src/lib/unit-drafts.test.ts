import assert from 'node:assert/strict'
import test from 'node:test'
import { convertWaterDraft, convertWeightDraft } from './unit-drafts.ts'

test('a typed water amount keeps its quantity when the unit changes', () => {
  assert.equal(convertWaterDraft(250, 'ml', 'fl_oz'), 8.5)
  assert.equal(convertWaterDraft(8, 'fl_oz', 'ml'), 237)
  assert.equal(convertWaterDraft(8, 'fl_oz', 'cup'), 1)
  assert.equal(convertWaterDraft(1.5, 'cup', 'fl_oz'), 12)
  assert.equal(convertWaterDraft(12, 'fl_oz', 'fl_oz'), 12)
})

test('a typed weight keeps its quantity when the unit changes', () => {
  assert.equal(convertWeightDraft(150, 'lb', 'kg'), 68)
  assert.equal(convertWeightDraft(70, 'kg', 'lb'), 154.3)
  assert.equal(convertWeightDraft(70, 'kg', 'kg'), 70)
})
