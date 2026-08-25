import assert from 'node:assert/strict';
import test from 'node:test';
import { FoodPortion, FoodPortionError } from '../dist/index.js';

const food = {
  id: 42,
  name: 'Test food',
  brandName: null,
  calories: 100,
  protein: 10,
  carbohydrates: 20,
  netCarbohydrates: 18,
  totalFat: 5,
  saturatedFat: 2,
  fiber: 2,
  totalSugars: 3,
  addedSugars: 1,
  sodium: 200,
  potassium: 300,
  cholesterol: 4,
  glycemicIndex: 50,
  glycemicLoad: 8,
  photoUrl: null,
  upc: null,
  nutrients: { calories: { value: 100, unit: 'cal' }, protein: { value: 10, unit: 'g' } },
  servings: [
    { id: 1, quantity: 1, unit: 'slice', scalingFactor: 1, weightGrams: 50, isPrimary: true },
    { id: 2, quantity: 2, unit: 'pieces', scalingFactor: 3, weightGrams: 120, isPrimary: false },
  ],
};

test('uses the primary serving and returns a request-ready selection', () => {
  const portion = FoodPortion.from(food);
  assert.equal(portion.serving.id, 1);
  assert.equal(portion.nutrition.calories.value, 100);
  assert.deepEqual(portion.selection, { id: 42, serving: { id: 1, quantity: 1 } });
});

test('scales nutrients, weight, and glycemic load for an alternate serving', () => {
  const portion = FoodPortion.from(food, { servingId: 2, quantity: 4 });
  assert.equal(portion.nutrition.calories.value, 600);
  assert.equal(portion.nutrition.protein.value, 60);
  assert.equal(portion.totalWeightGrams, 240);
  assert.equal(portion.glycemicIndex, 50);
  assert.equal(portion.glycemicLoad, 48);
});

test('rejects unavailable servings and unsafe quantities', () => {
  assert.throws(() => FoodPortion.from(food, { servingId: 999 }), (error) => error instanceof FoodPortionError && error.code === 'serving_not_found');
  assert.throws(() => FoodPortion.from(food, { quantity: 0 }), (error) => error instanceof FoodPortionError && error.code === 'invalid_quantity');
});
