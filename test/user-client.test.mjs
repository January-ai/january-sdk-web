import assert from 'node:assert/strict';
import test from 'node:test';
import { HeightUnit, JanuaryPartnerClient, Sex, WeightUnit } from '../dist/index.js';

test('scoped client applies immutable identity and preserves multi-food and date request shapes', async () => {
  const requests = [];
  const fetch = async (input, init) => {
    const url = new URL(String(input));
    requests.push({ url, init, body: init.body ? JSON.parse(init.body) : undefined });
    const isList = url.pathname === '/v1.2/food-logs' && init.method === 'GET';
    const isGlucose = url.pathname === '/v1.2/glucose/predictions';
    const response = isList
      ? { items: [] }
      : isGlucose
        ? { points: [], impact_score: 'low', chart: { min: 70, max: 140 } }
        : { id: '00000000-0000-0000-0000-000000000001', foods: [], eaten_at: '2026-08-25T16:30:00Z' };
    return new Response(JSON.stringify(response), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const client = new JanuaryPartnerClient({ apiKey: 'fixture', fetch });
  const scoped = client.forUser({ endUserId: ' user-42 ', endUserTimezone: ' America/New_York ' });
  const foods = [
    { id: '1', serving: { id: '11', quantity: 1 } },
    { id: '2', serving: { id: '22', quantity: 1.5 } },
  ];

  await scoped.foodLogs.create({ foods, timestampUtc: '2026-08-25T12:30:00-04:00', name: 'Lunch' });
  await scoped.foodLogs.list({ start: '2026-08-23', end: '2026-08-29' });
  await scoped.foodLogs.update({ logId: '00000000-0000-0000-0000-000000000001', foods, timestampUtc: '2026-08-25T13:00:00-04:00' });
  await scoped.glucose.predict({
    userProfile: {
      age: 35,
      sex: Sex.female,
      height: { value: 66, unit: HeightUnit.inches },
      weight: { value: 145, unit: WeightUnit.pounds },
    },
    foods,
    startTime: new Date('2026-08-25T16:30:00Z'),
  });

  assert.deepEqual(scoped.context, { endUserId: 'user-42', endUserTimezone: 'America/New_York' });
  assert.ok(Object.isFrozen(scoped.context));
  assert.ok(requests.slice(0, 3).every(({ init }) => new Headers(init.headers).get('january-end-user-id') === 'user-42'));
  assert.equal(new Headers(requests[3].init.headers).get('january-end-user-id'), null);
  assert.deepEqual(requests[0].body.foods, [{ food_id: '1', serving_id: '11', quantity: 1 }, { food_id: '2', serving_id: '22', quantity: 1.5 }]);
  assert.equal(requests[0].body.eaten_at, '2026-08-25T16:30:00.000Z');
  assert.equal(requests[1].url.searchParams.get('start_date'), '2026-08-23');
  assert.equal(requests[1].url.searchParams.get('end_date'), '2026-08-29');
  assert.equal(requests[1].url.searchParams.get('timezone'), 'America/New_York');
  assert.equal(requests[2].body.eaten_at, '2026-08-25T17:00:00.000Z');
  assert.equal(requests[3].body.timezone, 'America/New_York');
});

test('scoped client rejects an empty partner user ID', () => {
  const client = new JanuaryPartnerClient({ apiKey: 'fixture' });
  assert.throws(() => client.forUser('  '), /end-user ID/);
});

test('scoped client applies one identity and cancellation signal across every discovery operation', async () => {
  const requests = [];
  const fetch = async (input, init) => {
    const url = new URL(String(input));
    requests.push({ url, init });
    const response = url.pathname.endsWith('/alternatives')
      ? { alternatives: [] }
      : /^\/v1\.2\/foods\/(?:\d+$|barcode\/)/.test(url.pathname)
      ? {
          id: '1', type: 'generic',
          name: 'banana',
          brand_name: null,
          nutrients: {},
          glycemic_index: null,
          glycemic_load: null,
          image_url: null,
          barcode: null,
          servings: [],
        }
      : url.pathname === '/v1.2/foods/autocomplete'
        ? { items: [] }
        : url.pathname === '/v1.2/food-analysis/text'
            ? { meal_name: null, total_nutrients: {}, detections: [] }
            : url.pathname.startsWith('/v1.2/restaurants')
              ? { items: [] }
              : url.pathname.startsWith('/v1.2/food-analysis/')
                ? { meal_name: null, total_nutrients: {}, detections: [] }
                : { items: [] };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const client = new JanuaryPartnerClient({ apiKey: 'fixture', fetch });
  const scoped = client.forUser('user-42', 'America/New_York');
  const controller = new AbortController();

  await scoped.foods.autocomplete({ query: 'ban', signal: controller.signal });
  await scoped.foods.get({ foodId: '1', signal: controller.signal });
  await scoped.foods.search({ query: 'banana', signal: controller.signal });
  await scoped.foods.lookupBarcode({ upc: '012345678905', signal: controller.signal });
  await scoped.foodAnalysis.analyzeDescription({ query: 'banana and oats', signal: controller.signal });
  await scoped.foods.suggestAlternatives({ foodId: '1', signal: controller.signal });
  await scoped.restaurants.search({ query: 'cafe', latitude: 40, longitude: -74, signal: controller.signal });
  await scoped.restaurants.searchMenuItems({ query: 'salad', latitude: 40, longitude: -74, signal: controller.signal });
  await scoped.foodAnalysis.analyzePhoto({ image: 'https://example.com/meal.jpg', signal: controller.signal });
  await scoped.foodAnalysis.correct({
    analysis: { mealName: 'Lunch', totalNutrients: {}, detections: [] },
    instruction: 'add avocado',
    signal: controller.signal,
  });

  assert.equal(requests.length, 10);
  assert.ok(requests.every(({ init }) => new Headers(init.headers).get('january-end-user-id') === null));
  assert.ok(requests.every(({ init }) => init.signal === controller.signal));
});

test('scoped client never sends redundant identity with client-token authentication', async () => {
  let endUserId;
  const client = new JanuaryPartnerClient({
    accessToken: 'ct-scoped',
    fetch: async (_input, init) => {
      endUserId = new Headers(init.headers).get('x-end-user-id');
      return new Response(JSON.stringify({ total_count: 0, items: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  await client.forUser('token-bound-user').foods.search({ query: 'banana' });
  assert.equal(endUserId, null);
});
