import assert from 'node:assert/strict';
import test from 'node:test';
import { HeightUnit, JanuaryPartnerClient, Sex, WeightUnit } from '../dist/index.js';

test('all 17 client operations are exposed through the public client', async () => {
  const requests = [];
  const fetch = async (input, init) => {
    const url = new URL(String(input));
    requests.push({ url, init });
    return new Response(JSON.stringify(responseFor(url.pathname, init.method)), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const client = new JanuaryPartnerClient({ apiKey: 'fixture-key', fetch });
  const endUserId = 'fixture-user';
  const food = { id: '1', serving: { id: '2', quantity: 1 } };

  await client.foods.autocomplete({ query: 'ban', endUserId });
  await client.foods.get({ foodId: '1', endUserId });
  await client.foods.search({ query: 'banana', endUserId });
  await client.foods.lookupBarcode({ upc: '049000006346', endUserId });
  await client.foodAnalysis.analyzeDescription({ query: 'one banana', endUserId });
  await client.foods.suggestAlternatives({ foodId: '1', dietRestrictions: [], dietPreferences: [], endUserId });
  await client.restaurants.search({ query: 'cafe', latitude: 40, longitude: -74, endUserId });
  await client.restaurants.searchMenuItems({ query: 'salad', latitude: 40, longitude: -74, endUserId });
  await client.restaurants.getMenuItems({ restaurantId: 'restaurant-1', endUserId });
  await client.foodAnalysis.analyzePhoto({ image: 'fixture-image', endUserId });
  await client.foodAnalysis.correct({
    analysis: { mealName: 'Meal', totalNutrients: {}, detections: [{ food: { id: '1', name: 'Banana', nutrients: {} } }] },
    instruction: 'Add banana', endUserId,
  });
  const created = await client.foodLogs.create({ endUserId, foods: [food] });
  await client.foodLogs.list({ endUserId, start: '2026-08-21', end: '2026-08-23' });
  await client.foodLogs.get({ endUserId, logId: created.id });
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
    '/v1.2/foods/barcode/049000006346', '/v1.2/food-analysis/text',
    '/v1.2/foods/1/alternatives', '/v1.2/restaurants', '/v1.2/menu-items',
    '/v1.2/restaurants/restaurant-1/menu-items', '/v1.2/food-analysis/image', '/v1.2/food-analysis/corrections', '/v1.2/food-logs', '/v1.2/food-logs',
    '/v1.2/food-logs/00000000-0000-0000-0000-000000000001',
    '/v1.2/food-logs/00000000-0000-0000-0000-000000000001',
    '/v1.2/food-logs/00000000-0000-0000-0000-000000000001', '/v1.2/glucose/predictions',
  ]);
  assert.ok(requests.every(({ init }) => new Headers(init.headers).get('authorization') === 'Bearer fixture-key'));
});

function responseFor(path, method) {
  if (path === '/v1.2/foods/autocomplete') return { items: [{ id: '1', name: 'banana', brand_name: null, image_url: null, nutrients: null }] };
  if (path === '/v1.2/foods/1') {
    return {
      id: '1', type: 'generic',
      name: 'banana',
      nutrients: { calories: { value: 100, unit: 'cal' } },
      servings: [{ id: '2', quantity: 1, unit: 'item', scaling_factor: 1, weight_grams: null, is_primary: true }],
    };
  }
  if (path.includes('/food-analysis/text')) return { meal_name: null, total_nutrients: {}, detections: [] };
  if (path.includes('/alternatives')) return { alternatives: [] };
  if (path === '/v1.2/foods') return { items: [] };
  if (path.includes('/foods/barcode/')) return { id: '1', type: 'generic', name: 'banana', brand_name: null, nutrients: {}, glycemic_index: null, glycemic_load: null, image_url: null, barcode: null, servings: [] };
  if (path === '/v1.2/restaurants' || path === '/v1.2/menu-items' || path.includes('/restaurants/restaurant-1/menu-items')) return { items: [] };
  if (path.includes('/food-analysis/')) return { meal_name: 'Fixture meal', total_nutrients: {}, detections: [] };
  if (path === '/v1.2/food-logs' && method === 'GET') return { items: [] };
  if (path.includes('/food-logs/') && method === 'DELETE') return { status: 'deleted' };
  if (path.includes('/food-logs')) {
    return { id: '00000000-0000-0000-0000-000000000001', foods: [], eaten_at: '2026-08-22T12:00:00Z', name: 'Fixture' };
  }
  if (path.includes('/glucose/predictions')) {
    return { points: [{ minutes: 0, value: 100 }], impact_score: 'low', chart: { min: 70, max: 140 } };
  }
  throw new Error(`No fixture response for ${method} ${path}`);
}
