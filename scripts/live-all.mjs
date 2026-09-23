import {
  ActivityLevel,
  HeightUnit,
  JanuaryPartnerClient,
  Sex,
  VolumeUnit,
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

const autocomplete = await client.foods.autocomplete({ query: 'ban', limit: 3 });
if (!autocomplete.items.length) throw new Error('foods.autocomplete returned no items.');
pass('foods.autocomplete', `${autocomplete.items.length} items`);

const search = await client.foods.search({ query: 'banana', limit: 3 });
const food = search.items[0];
const serving = food?.servings[0];
if (!food || !serving?.id) throw new Error('foods.search returned no usable food.');
pass('foods.search', `${search.items.length} items`);

const hydratedFood = await client.foods.get({ foodId: food.id });
pass('foods.get', hydratedFood.id);

const natural = await client.foodAnalysis.analyzeDescription({
  query: 'one banana and a bowl of oatmeal',
});
pass('foodAnalysis.analyzeDescription', `${natural.detections.length} detections`);

const alternatives = await client.foods.suggestAlternatives({
  foodId: food.id,
  dietRestrictions: [],
  dietPreferences: [],
});
pass('foods.suggestAlternatives', `${alternatives.alternatives.length} alternatives`);

const barcode = await client.foods.lookupBarcode({ upc: '049000006346' });
pass('foods.lookupBarcode', `${barcode.items.length} items`);

const restaurants = await client.restaurants.search({
  query: 'mcdonalds', latitude: 37.7749, longitude: -122.4194, limit: 3,
});
pass('restaurants.search', `${restaurants.items.length} items`);

const menuItems = await client.restaurants.searchMenuItems({
  query: 'burger', latitude: 37.7749, longitude: -122.4194, limit: 3,
});
pass('restaurants.searchMenuItems', `${menuItems.items.length} items`);

let restaurantMenu;
for (const restaurant of restaurants.items) {
  try {
    restaurantMenu = await client.restaurants.getMenuItems({ restaurantId: restaurant.id, limit: 3 });
    break;
  } catch (error) {
    if (error?.status !== 404) throw error;
  }
}
if (!restaurantMenu) throw new Error('No restaurant search result supported menu lookup.');
pass('restaurants.getMenuItems', `${restaurantMenu.items.length} items`);

const scan = await client.foodAnalysis.analyzePhoto({
  image: 'https://friendlysrestaurants.com/assets/live/img/production/detail/menu/lunch-dinner_999-combohs_all-american-burger-fries.jpg',
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
});
if (!base64Scan.mealName || !base64Scan.detections?.length) {
  throw new Error('foodAnalysis.analyzePhoto returned no detections for the base64 fixture.');
}
pass('foodAnalysis.analyzePhoto base64', `${base64Scan.detections.length} detections`);

await client.foodAnalysis.correct({
  analysis: scan,
  instruction: 'Rename the meal to January Web SDK smoke test meal.',
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

  const fetched = await client.foodLogs.get({ endUserId, endUserTimezone: timezone, logId: created.id });
  if (fetched.id !== created.id) throw new Error('foodLogs.get returned the wrong log.');
  pass('foodLogs.get');

  const summary = await client.foodLogs.getSummary({ endUserId, endUserTimezone: timezone, start, end });
  if (summary.totals.logsCount < 1) throw new Error('foodLogs.getSummary did not count the created log.');
  pass('foodLogs.getSummary', `${summary.buckets.length} buckets`);

  const updated = await client.foodLogs.update({
    endUserId, endUserTimezone: timezone, logId: created.id, name: 'January Web SDK smoke updated',
  });
  if (updated.name !== 'January Web SDK smoke updated') {
    throw new Error('foodLogs.update did not persist the name.');
  }
  pass('foodLogs.update');

  await client.foodLogs.delete({
    endUserId, endUserTimezone: timezone, logId: created.id,
  });
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

const user = client.forUser({ endUserId, endUserTimezone: timezone });
// The API files logs under the end user's local day, which differs from the UTC day around midnight.
const logDay = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
let waterLogId;
try {
  const water = await user.waterLogs.create({ amount: { value: 8, unit: VolumeUnit.fluidOunces } });
  waterLogId = water.id;
  pass('waterLogs.create', `${water.amount.value} ${water.amount.unit}`);

  const totals = await user.waterLogs.list({ start: logDay, end: logDay, unit: VolumeUnit.milliliters });
  if (!totals.items.some((day) => day.total.value >= 236)) {
    throw new Error('waterLogs.list did not include the logged amount.');
  }
  pass('waterLogs.list', `${totals.items.length} days`);

  await user.waterLogs.delete({ logId: water.id });
  waterLogId = undefined;
  pass('waterLogs.delete');
} finally {
  if (waterLogId) await user.waterLogs.delete({ logId: waterLogId }).catch(() => {});
}

const weight = await user.weightLogs.create({ weight: { value: 175, unit: WeightUnit.pounds } });
pass('weightLogs.create', `${weight.weight.value} ${weight.weight.unit}`);
const weights = await user.weightLogs.list({ start: logDay, end: logDay });
if (!weights.items.some((day) => day.weight.value === 175)) {
  throw new Error('weightLogs.list did not return the logged weight.');
}
pass('weightLogs.list', `${weights.items.length} days`);

console.log('PASS all 23 client Partner API v1.2 operations through the public Web SDK');

function pass(operation, detail) {
  console.log(`PASS ${operation}${detail ? ` (${detail})` : ''}`);
}
