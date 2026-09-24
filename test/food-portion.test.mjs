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
  // The API reads a selection's quantity as a count of servings: 4 pieces of a "2 pieces"
  // serving is 2.
  assert.deepEqual(portion.selection, { id: 42, serving: { id: 2, quantity: 2 } });
});

// Greek yogurt as the catalog returns it: nutrients are for the primary "6 oz" serving. The API
// reads a selection's quantity as a number of servings, so sending 6 for this serving logs six
// servings (about 600 kcal) instead of one (100 kcal).
const yogurt = {
  ...food,
  id: '70376084',
  name: 'Greek yogurt',
  glycemicIndex: 11,
  glycemicLoad: 1,
  nutrients: { calories: { value: 100, unit: 'kcal' }, protein: { value: 17, unit: 'g' } },
  servings: [
    { id: '34157706', quantity: 6, unit: 'oz', scalingFactor: 1, weightGrams: 170, isPrimary: true },
    { id: '34157707', quantity: 1, unit: 'cup', scalingFactor: 1.5, weightGrams: 255, isPrimary: false },
  ],
};

test('a 6 oz serving by default is one serving', () => {
  const portion = FoodPortion.from(yogurt);
  assert.equal(portion.quantity, 6);
  assert.deepEqual(portion.selection, { id: '70376084', serving: { id: '34157706', quantity: 1 } });
});

test('12 oz of a 6 oz serving is two servings', () => {
  const portion = FoodPortion.from(yogurt, { quantity: 12 });
  assert.equal(portion.quantity, 12);
  assert.deepEqual(portion.selection, { id: '70376084', serving: { id: '34157706', quantity: 2 } });
});

test('a 1-cup serving sends the amount unchanged', () => {
  assert.equal(FoodPortion.from(yogurt, { servingId: '34157707' }).selection.serving.quantity, 1);
  assert.equal(FoodPortion.from(yogurt, { servingId: '34157707', quantity: 1.5 }).selection.serving.quantity, 1.5);
});

test('150 g of a 100 g serving is 1.5 servings', () => {
  const rice = {
    ...food,
    id: '5001',
    name: 'White rice',
    nutrients: { calories: { value: 130, unit: 'kcal' } },
    servings: [{ id: '9', quantity: 100, unit: 'g', scalingFactor: 1, weightGrams: 100, isPrimary: true }],
  };
  const portion = FoodPortion.from(rice, { quantity: 150 });
  assert.deepEqual(portion.selection, { id: '5001', serving: { id: '9', quantity: 1.5 } });
  assert.equal(portion.nutrition.calories.value, 195);
  assert.equal(portion.totalWeightGrams, 150);
});

test('nutrition still follows the amount in the serving unit', () => {
  const single = FoodPortion.from(yogurt);
  assert.equal(single.nutrition.calories.value, 100);
  assert.equal(single.nutrition.protein.value, 17);
  assert.equal(single.totalWeightGrams, 170);
  assert.equal(single.glycemicLoad, 1);

  const double = FoodPortion.from(yogurt, { quantity: 12 });
  assert.equal(double.nutrition.calories.value, 200);
  assert.equal(double.nutrition.protein.value, 34);
  assert.equal(double.totalWeightGrams, 340);
  assert.equal(double.glycemicLoad, 2);

  const cups = FoodPortion.from(yogurt, { servingId: '34157707', quantity: 2 });
  assert.equal(cups.nutrition.calories.value, 300);
  assert.equal(cups.totalWeightGrams, 510);
});

test('rejects unavailable servings and unsafe quantities', () => {
  assert.throws(() => FoodPortion.from(food, { servingId: 999 }), (error) => error instanceof FoodPortionError && error.code === 'serving_not_found');
  assert.throws(() => FoodPortion.from(food, { quantity: 0 }), (error) => error instanceof FoodPortionError && error.code === 'invalid_quantity');
});
