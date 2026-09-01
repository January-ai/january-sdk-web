import {
  ActivityLevel,
  HeightUnit,
  JanuaryPartnerClient,
  Sex,
  WeightUnit,
} from '../dist/index.js';
import { readFile } from 'node:fs/promises';

const apiKey = process.env.JANUARY_API_KEY;
const endUserId = process.env.JANUARY_END_USER_ID;
if (!apiKey) throw new Error('JANUARY_API_KEY is not configured.');
if (!endUserId) throw new Error('JANUARY_END_USER_ID is not configured.');

const client = new JanuaryPartnerClient({
  apiKey,
  ...(process.env.JANUARY_BASE_URL ? { baseUrl: process.env.JANUARY_BASE_URL } : {}),
});

const search = await client.foods.search({ query: 'banana', endUserId, limit: 3 });
const food = search.items[0];
const serving = food?.servings[0];
if (!food || !serving) throw new Error('foods.search returned no usable food.');
pass('foods.search', `${search.items.length} items`);

const natural = await client.foodAnalysis.analyzeDescription({
  query: 'one banana and a bowl of oatmeal', endUserId,
});
pass('foodAnalysis.analyzeDescription', `${natural.detections.length} detections`);

const alternatives = await client.foods.suggestAlternatives({
  foodId: food.id,
  endUserId,
  dietRestrictions: [],
  dietPreferences: [],
});
pass('foods.suggestAlternatives', `${alternatives.alternatives.length} alternatives`);

const barcode = await client.foods.lookupBarcode({ upc: '049000006346', endUserId });
pass('foods.lookupBarcode', `${barcode.items.length} items`);

const restaurants = await client.restaurants.search({
  query: 'mcdonalds', latitude: 37.7749, longitude: -122.4194, endUserId, limit: 3,
});
pass('restaurants.search', `${restaurants.items.length} items`);

const menuItems = await client.restaurants.searchMenuItems({
  query: 'burger', latitude: 37.7749, longitude: -122.4194, endUserId, limit: 3,
});
pass('restaurants.searchMenuItems', `${menuItems.items.length} items`);

const scan = await client.foodAnalysis.analyzePhoto({
  image: 'https://friendlysrestaurants.com/assets/live/img/production/detail/menu/lunch-dinner_999-combohs_all-american-burger-fries.jpg',
  endUserId,
});
if (!scan.mealName || !scan.detections?.length) {
  throw new Error('foodAnalysis.analyzePhoto returned no correctable detections.');
}
pass('foodAnalysis.analyzePhoto', `${scan.detections.length} detections`);

const photoFixture = await readFile(
  new URL('../test/fixtures/photo-scanning/burger-and-fries.png', import.meta.url),
);
const base64Scan = await client.foodAnalysis.analyzePhoto({
  image: `data:image/png;base64,${photoFixture.toString('base64')}`,
  endUserId,
});
if (!base64Scan.mealName || !base64Scan.detections?.length) {
  throw new Error('foodAnalysis.analyzePhoto returned no detections for the base64 fixture.');
}
pass('foodAnalysis.analyzePhoto base64', `${base64Scan.detections.length} detections`);

await client.foodAnalysis.correct({
  mealName: scan.mealName,
  detections: scan.detections,
  userInput: 'Rename the meal to January Web SDK smoke test meal.',
  endUserId,
});
pass('foodAnalysis.correct');

const selectedFood = { id: food.id, serving: { id: serving.id, quantity: 1 } };
const timezone = 'America/New_York';
let createdLogId;
try {
  const created = await client.foodLogs.create({
    endUserId,
    endUserTimezone: timezone,
    foods: [selectedFood],
    timestampUtc: new Date().toISOString(),
    name: `January Web SDK smoke ${crypto.randomUUID()}`,
  });
  createdLogId = created.id;
  pass('foodLogs.create');

  const today = new Date();
  const start = new Date(today.getTime() - 86_400_000).toISOString().slice(0, 10);
  const end = new Date(today.getTime() + 86_400_000).toISOString().slice(0, 10);
  const listed = await client.foodLogs.list({ endUserId, endUserTimezone: timezone, start, end });
  if (!listed.items.some((item) => item.id === created.id)) {
    throw new Error('foodLogs.list did not return the created log.');
  }
  pass('foodLogs.list');

  const updated = await client.foodLogs.update({
    endUserId, endUserTimezone: timezone, logId: created.id, name: 'January Web SDK smoke updated',
  });
  if (updated.name !== 'January Web SDK smoke updated') {
    throw new Error('foodLogs.update did not persist the name.');
  }
  pass('foodLogs.update');

  const deleted = await client.foodLogs.delete({
    endUserId, endUserTimezone: timezone, logId: created.id,
  });
  if (deleted.status !== 'deleted') throw new Error(`foodLogs.delete returned ${deleted.status}.`);
  createdLogId = undefined;
  pass('foodLogs.delete');
} finally {
  if (createdLogId) {
    await client.foodLogs.delete({ endUserId, endUserTimezone: timezone, logId: createdLogId }).catch(() => {});
  }
}

const prediction = await client.glucose.predict({
  endUserId,
  endUserTimezone: timezone,
  userProfile: {
    age: 35,
    sex: Sex.male,
    height: { value: 70, unit: HeightUnit.inches },
    weight: { value: 175, unit: WeightUnit.pounds },
    activityLevel: ActivityLevel.moderatelyActive,
    healthConditions: [],
  },
  foods: [selectedFood],
  startTime: new Date(),
});
if (!prediction.prediction.length) throw new Error('glucose.predict returned no points.');
pass('glucose.predict', `${prediction.prediction.length} points`);

console.log('PASS all 13 Partner API v1.2 operations through the public Web SDK');

function pass(operation, detail) {
  console.log(`PASS ${operation}${detail ? ` (${detail})` : ''}`);
}
