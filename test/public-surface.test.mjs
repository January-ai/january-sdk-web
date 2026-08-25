import assert from 'node:assert/strict';
import test from 'node:test';
import { HeightUnit, JanuaryPartnerClient, Sex, WeightUnit } from '../dist/index.js';

test('all 15 operations are exposed through the public client', async () => {
  const requests = [];
  const fetch = async (input, init) => {
    const url = new URL(String(input));
    requests.push({ url, init });
    return new Response(JSON.stringify(responseFor(url.pathname, init.method)), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const client = new JanuaryPartnerClient({ apiKey: 'fixture-key', baseUrl: 'https://example.test', fetch });
  const endUserId = 'fixture-user';
  const food = { id: 1, serving: { id: 2, quantity: 1 } };

  await client.foods.autocomplete({ query: 'ban', endUserId });
  await client.foods.getFood({ foodId: 1, endUserId });
  await client.foods.search({ query: 'banana', endUserId });
  await client.foods.lookupBarcode({ upc: '049000006346', endUserId });
  await client.foods.searchNaturalLanguage({ query: 'one banana', endUserId });
  await client.foods.suggestAlternatives({ foodId: 1, dietRestrictions: [], dietPreferences: [], endUserId });
  await client.restaurants.search({ query: 'cafe', latitude: 40, longitude: -74, endUserId });
  await client.restaurants.searchMenuItems({ query: 'salad', latitude: 40, longitude: -74, endUserId });
  await client.photoScanning.scan({ image: 'fixture-image', endUserId });
  await client.photoScanning.correct({
    mealName: 'Meal', detections: [{ food: { id: 1, name: 'Banana', nutrients: {} } }],
    userInput: 'Add banana', endUserId,
  });
  const created = await client.foodLogs.create({ endUserId, foods: [food] });
  await client.foodLogs.list({ endUserId, start: '2026-08-21', end: '2026-08-23' });
  await client.foodLogs.update({ endUserId, logId: created.id, name: 'Updated' });
  await client.foodLogs.delete({ endUserId, logId: created.id });
  await client.glucose.predict({
    userProfile: {
      age: 35,
      sex: Sex.male,
      height: { value: 70, unit: HeightUnit.inches },
      weight: { value: 175, unit: WeightUnit.pounds },
    },
    foods: [food], startTime: new Date('2026-08-22T12:00:00Z'), endUserId,
  });

  assert.deepEqual(requests.map(({ url }) => url.pathname), [
    '/v1.2/foods/autocomplete', '/v1.2/foods/1', '/v1.2/foods',
    '/v1.2/foods/barcode/049000006346', '/v1.2/food-scans/text',
    '/v1.2/foods/1/alternatives', '/v1.2/restaurants', '/v1.2/restaurants/menu-items',
    '/v1.2/food-scans/photo', '/v1.2/food-scans/corrections', '/v1.2/food-logs', '/v1.2/food-logs',
    '/v1.2/food-logs/00000000-0000-0000-0000-000000000001',
    '/v1.2/food-logs/00000000-0000-0000-0000-000000000001', '/v1.2/glucose/predictions',
  ]);
  assert.ok(requests.every(({ init }) => new Headers(init.headers).get('authorization') === 'Bearer fixture-key'));
});

function responseFor(path, method) {
  if (path === '/v1.2/foods/autocomplete') return { items: [{ id: 1, name: 'banana' }] };
  if (path === '/v1.2/foods/1') {
    return {
      id: 1,
      name: 'banana',
      nutrients: { calories: { value: 100, unit: 'cal' } },
      servings: [{ id: 2, quantity: 1, unit: 'item', scaling_factor: 1, is_primary: true }],
    };
  }
  if (path.includes('/food-scans/text')) return { detections: [] };
  if (path.includes('/alternatives')) return { alternatives: [] };
  if (path === '/v1.2/foods' || path.includes('/foods/barcode/')) return { total_count: 0, items: [] };
  if (path === '/v1.2/restaurants' || path.includes('/restaurants/menu-items')) return { total_count: 0, items: [] };
  if (path.includes('/food-scans/')) return { meal_name: 'Fixture meal', detections: [] };
  if (path === '/v1.2/food-logs' && method === 'GET') return { total_count: 0, items: [] };
  if (path.includes('/food-logs/') && method === 'DELETE') return { status: 'deleted' };
  if (path.includes('/food-logs')) {
    return { id: '00000000-0000-0000-0000-000000000001', foods: [], timestamp_utc: '2026-08-22T12:00:00Z', name: 'Fixture' };
  }
  if (path.includes('/glucose/predictions')) {
    return { prediction: [{ minutes: 0, value: 100 }], impact_score: 'low', chart: { min: 70, max: 140 } };
  }
  throw new Error(`No fixture response for ${method} ${path}`);
}
