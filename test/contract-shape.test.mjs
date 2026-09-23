import assert from 'node:assert/strict';
import test from 'node:test';
import { JanuaryPartnerClient } from '../dist/index.js';

// Responses captured from the live Partner API on 2026-09-15, after the detected-food shape changed,
// with the serving weight the API added on 2026-09-22.
const textAnalysis = { meal_name: null, total_nutrients: { calories: { value: 206.8, unit: 'kcal' }, protein: { value: 14.58, unit: 'g' } }, detections: [{ confidence: null, food: { id: '70382174', name: 'eggs', brand_name: null, nutrients: { calories: { value: 143, unit: 'kcal' }, protein: { value: 12.6, unit: 'g' } }, quantity: 2, serving: { id: '34073350', quantity: 1, unit: 'large', weight_grams: 50 } } }] };
const summary = { group_by: 'day', week_start: null, timezone: 'America/Chicago', start_date: '2026-09-14', end_date: '2026-09-14', buckets: [{ start_date: '2026-09-14', end_date: '2026-09-14', logs_count: 1, days_with_logs: 1, nutrients: { calories: { value: 1853.06, unit: 'kcal' }, protein: { value: 79.8822, unit: 'g' } } }], totals: { logs_count: 3, days_with_logs: 2, nutrients: { calories: { value: 3656.4883824999997, unit: 'kcal' } } }, average_per_logged_day: { nutrients: { calories: { value: 1828.2441912499999, unit: 'kcal' } } } };

function makeClient(bodyFor) {
  const requests = [];
  const fetch = async (input, init) => {
    const url = new URL(String(input));
    requests.push({ url, init, body: init?.body ? JSON.parse(init.body) : undefined });
    return new Response(JSON.stringify(bodyFor(url)), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  return { client: new JanuaryPartnerClient({ apiKey: 'fixture-key', fetch }), requests };
}

test('a detection carries the selected serving and the quantity eaten', async () => {
  const { client } = makeClient(() => textAnalysis);
  const scan = await client.foodAnalysis.analyzeDescription({ query: 'three eggs' });
  const food = scan.detections[0].food;
  assert.equal(food.name, 'eggs');
  assert.equal(food.quantity, 2);
  assert.deepEqual(food.serving, { id: '34073350', quantity: 1, unit: 'large', weightGrams: 50 });
  assert.equal(food.nutrients.calories.value, 143);
  assert.equal(scan.totalNutrients.calories.value, 206.8);
  assert.equal('servings' in food, false);
});

test('a correction sends the scan back field for field', async () => {
  const { client, requests } = makeClient(() => textAnalysis);
  const scan = await client.foodAnalysis.analyzeDescription({ query: 'three eggs' });
  await client.foodAnalysis.correct({ analysis: scan, instruction: 'make it two eggs' });
  assert.deepEqual(requests[1].body, { analysis: textAnalysis, instruction: 'make it two eggs' });
});

test('a scan that predates serving weights is corrected with an unknown weight', async () => {
  const { client, requests } = makeClient(() => textAnalysis);
  await client.foodAnalysis.correct({
    analysis: { mealName: null, totalNutrients: {}, detections: [{ food: { id: '70382174', name: 'eggs', nutrients: {}, quantity: 2, serving: { id: '34073350', quantity: 1, unit: 'large' } } }] },
    instruction: 'make it two eggs',
  });
  assert.deepEqual(requests[0].body.analysis.detections[0], { confidence: null, food: { id: '70382174', name: 'eggs', brand_name: null, nutrients: {}, quantity: 2, serving: { id: '34073350', quantity: 1, unit: 'large', weight_grams: null } } });
});

test('photo scan sends reasoning effort only when asked', async () => {
  const { client, requests } = makeClient(() => ({ meal_name: null, total_nutrients: {}, detections: [] }));
  await client.foodAnalysis.analyzePhoto({ image: 'https://example.com/meal.jpg' });
  await client.foodAnalysis.analyzePhoto({ image: 'https://example.com/meal.jpg', reasoningEffort: 'xhigh' });
  assert.equal('reasoning' in requests[0].body, false);
  assert.deepEqual(requests[1].body.reasoning, { effort: 'xhigh' });
});

test('alternatives keep their serving list', async () => {
  const { client } = makeClient(() => ({ alternatives: [{ id: '70372230', name: 'brown rice', brand_name: null, nutrients: { calories: { value: 108, unit: 'kcal' } }, servings: [{ id: '34113801', quantity: 0.5, unit: 'cup', weight_grams: 81 }] }] }));
  const { alternatives } = await client.foods.suggestAlternatives({ foodId: '1', dietRestrictions: [], dietPreferences: [] });
  assert.equal(alternatives[0].name, 'brown rice');
  assert.deepEqual(alternatives[0].servings, [{ id: '34113801', quantity: 0.5, unit: 'cup', weightGrams: 81 }]);
});

test('food-log summary decodes and sends the range parameters', async () => {
  const { client, requests } = makeClient(() => summary);
  const result = await client.foodLogs.getSummary({ endUserId: 'fixture-user', endUserTimezone: 'America/Chicago', start: '2026-09-14', end: '2026-09-14' });
  const { url, init } = requests[0];
  assert.equal(url.pathname, '/v1.2/food-logs/summary');
  assert.deepEqual(Object.fromEntries(url.searchParams), { start_date: '2026-09-14', end_date: '2026-09-14', timezone: 'America/Chicago', group_by: 'day', week_start: 'monday' });
  assert.equal(new Headers(init.headers).get('January-End-User-ID'), 'fixture-user');
  assert.equal(result.groupBy, 'day');
  assert.equal(result.weekStart, null);
  assert.equal(result.startDate, '2026-09-14');
  assert.equal(result.buckets.length, 1);
  assert.equal(result.buckets[0].startDate, '2026-09-14');
  assert.equal(result.buckets[0].logsCount, 1);
  assert.equal(result.buckets[0].nutrients.calories.value, 1853.06);
  assert.equal(result.totals.logsCount, 3);
  assert.equal(result.totals.daysWithLogs, 2);
  assert.ok(Math.abs(result.averagePerLoggedDay.nutrients.calories.value - 1828.244) < 0.001);
});

test('a weekly summary uses the requested week start through the user client', async () => {
  const { client, requests } = makeClient(() => ({ ...summary, group_by: 'week', week_start: 'sunday' }));
  const user = client.forUser({ endUserId: 'fixture-user', endUserTimezone: 'America/Chicago' });
  const result = await user.foodLogs.getSummary({ start: '2026-09-01', end: '2026-09-30', groupBy: 'week', weekStart: 'sunday' });
  assert.equal(requests[0].url.searchParams.get('group_by'), 'week');
  assert.equal(requests[0].url.searchParams.get('week_start'), 'sunday');
  assert.equal(result.groupBy, 'week');
  assert.equal(result.weekStart, 'sunday');
});
