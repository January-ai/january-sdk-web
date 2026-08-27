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
      ? { total_count: 0, items: [] }
      : isGlucose
        ? { prediction: [], impact_score: 'low', chart: { min: 70, max: 140 } }
        : { id: '00000000-0000-0000-0000-000000000001', foods: [], timestamp_utc: '2026-08-25T16:30:00Z' };
    return new Response(JSON.stringify(response), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const client = new JanuaryPartnerClient({ apiKey: 'fixture', fetch });
  const scoped = client.forUser({ endUserId: ' user-42 ', endUserTimezone: ' America/New_York ' });
  const foods = [
    { id: 1, serving: { id: 11, quantity: 1 } },
    { id: 2, serving: { id: 22, quantity: 1.5 } },
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
  assert.ok(requests.every(({ init }) => new Headers(init.headers).get('x-end-user-id') === 'user-42'));
  assert.ok(requests.every(({ init }) => new Headers(init.headers).get('x-end-user-timezone') === 'America/New_York'));
  assert.deepEqual(requests[0].body.foods, foods);
  assert.equal(requests[0].body.timestamp_utc, '2026-08-25T16:30:00.000Z');
  assert.equal(requests[1].url.searchParams.get('start'), '2026-08-23');
  assert.equal(requests[1].url.searchParams.get('end'), '2026-08-29');
  assert.deepEqual(requests[2].body.foods, foods);
  assert.equal(requests[2].body.timestamp_utc, '2026-08-25T17:00:00.000Z');
});

test('scoped client rejects an empty partner user ID', () => {
  const client = new JanuaryPartnerClient({ apiKey: 'fixture' });
  assert.throws(() => client.forUser('  '), /end-user ID/);
});
