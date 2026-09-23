import assert from 'node:assert/strict';
import test from 'node:test';
import { JanuaryError, JanuaryPartnerClient, VolumeUnit, WeightUnit } from '../dist/index.js';

// Response shapes from the Partner API v1.2 contract (water-logs and weight-logs).
const waterLog = { id: '9c1f2a3b-4d5e-4f60-8a71-b2c3d4e5f607', amount: { value: 8, unit: 'fl_oz' }, consumed_at: '2026-09-10T14:30:15.123Z' };
const waterTotals = { items: [{ date: '2026-09-09', total: { value: 48.5, unit: 'fl_oz' } }, { date: '2026-09-10', total: { value: 64, unit: 'fl_oz' } }] };
const weightLog = { weight: { value: 150, unit: 'lb' }, measured_at: '2026-09-10T14:30:15.123Z' };
const weights = { items: [{ date: '2026-09-08', weight: { value: 151.2, unit: 'lb' } }, { date: '2026-09-10', weight: { value: 150, unit: 'lb' } }] };

function makeClient(respond) {
  const requests = [];
  const fetch = async (input, init) => {
    const url = new URL(String(input));
    requests.push({ url, init, body: init?.body ? JSON.parse(init.body) : undefined });
    const { status = 200, body } = respond(url, init);
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
    });
  };
  return { client: new JanuaryPartnerClient({ apiKey: 'fixture-key', fetch }), requests };
}

test('water logs create, list, and delete through the scoped client', async () => {
  const { client, requests } = makeClient((url, init) => {
    if (init.method === 'POST') return { status: 201, body: waterLog };
    if (init.method === 'DELETE') return { status: 204 };
    return { body: waterTotals };
  });
  const user = client.forUser({ endUserId: 'fixture-user', endUserTimezone: 'America/Los_Angeles' });

  const created = await user.waterLogs.create({ amount: { value: 8, unit: VolumeUnit.fluidOunces }, consumedAt: '2026-09-10T07:30:15-07:00' });
  assert.deepEqual(created, { id: waterLog.id, amount: { value: 8, unit: 'fl_oz' }, consumedAt: '2026-09-10T14:30:15.123Z' });
  assert.equal(requests[0].url.pathname, '/v1.2/water-logs');
  assert.deepEqual(requests[0].body, { amount: { value: 8, unit: 'fl_oz' }, consumed_at: '2026-09-10T14:30:15.000Z' });
  assert.equal(new Headers(requests[0].init.headers).get('January-End-User-ID'), 'fixture-user');

  const totals = await user.waterLogs.list({ start: '2026-09-01', end: '2026-09-10', unit: VolumeUnit.fluidOunces });
  assert.equal(requests[1].url.pathname, '/v1.2/water-logs');
  assert.deepEqual(Object.fromEntries(requests[1].url.searchParams), { start_date: '2026-09-01', end_date: '2026-09-10', timezone: 'America/Los_Angeles', unit: 'fl_oz' });
  assert.deepEqual(totals, { items: [{ date: '2026-09-09', total: { value: 48.5, unit: 'fl_oz' } }, { date: '2026-09-10', total: { value: 64, unit: 'fl_oz' } }] });

  assert.equal(await user.waterLogs.delete({ logId: created.id }), undefined);
  assert.equal(requests[2].init.method, 'DELETE');
  assert.equal(requests[2].url.pathname, `/v1.2/water-logs/${created.id}`);
  assert.equal(new Headers(requests[2].init.headers).get('January-End-User-ID'), 'fixture-user');
});

test('water logs omit consumed_at when it is not given and default the timezone', async () => {
  const { client, requests } = makeClient((url, init) => init.method === 'POST' ? { status: 201, body: waterLog } : { body: waterTotals });
  await client.waterLogs.create({ endUserId: 'fixture-user', amount: { value: 250, unit: VolumeUnit.milliliters } });
  assert.deepEqual(requests[0].body, { amount: { value: 250, unit: 'ml' } });
  await client.waterLogs.list({ endUserId: 'fixture-user', start: '2026-09-01', end: '2026-09-10', unit: VolumeUnit.milliliters });
  assert.equal(requests[1].url.searchParams.get('timezone'), 'UTC');
  assert.equal(requests[1].url.searchParams.get('unit'), 'ml');
});

test('water logs accept US cups on create and list', async () => {
  const { client, requests } = makeClient((url, init) => init.method === 'POST'
    ? { status: 201, body: { ...waterLog, amount: { value: 0.125, unit: 'cup' } } }
    : { body: { items: [{ date: '2026-09-10', total: { value: 8, unit: 'cup' } }] } });
  assert.equal(VolumeUnit.cups, 'cup');
  const created = await client.waterLogs.create({ endUserId: 'fixture-user', amount: { value: 0.125, unit: VolumeUnit.cups } });
  assert.deepEqual(requests[0].body, { amount: { value: 0.125, unit: 'cup' } });
  assert.deepEqual(created.amount, { value: 0.125, unit: 'cup' });
  const totals = await client.waterLogs.list({ endUserId: 'fixture-user', start: '2026-09-10', end: '2026-09-10', unit: VolumeUnit.cups });
  assert.equal(requests[1].url.searchParams.get('unit'), 'cup');
  assert.deepEqual(totals.items[0].total, { value: 8, unit: 'cup' });
});

test('weight logs create and list through the scoped client', async () => {
  const { client, requests } = makeClient((url, init) => init.method === 'POST' ? { status: 201, body: weightLog } : { body: weights });
  const user = client.forUser({ endUserId: 'fixture-user', endUserTimezone: 'America/Los_Angeles' });

  const created = await user.weightLogs.create({ weight: { value: 150, unit: WeightUnit.pounds }, measuredAt: '2026-09-10T14:30:15Z' });
  assert.deepEqual(created, { weight: { value: 150, unit: 'lb' }, measuredAt: '2026-09-10T14:30:15.123Z' });
  assert.equal(requests[0].url.pathname, '/v1.2/weight-logs');
  assert.deepEqual(requests[0].body, { weight: { value: 150, unit: 'lb' }, measured_at: '2026-09-10T14:30:15.000Z' });

  const listed = await user.weightLogs.list({ start: '2026-09-01', end: '2026-09-10' });
  assert.equal(requests[1].url.pathname, '/v1.2/weight-logs');
  assert.deepEqual(Object.fromEntries(requests[1].url.searchParams), { start_date: '2026-09-01', end_date: '2026-09-10', timezone: 'America/Los_Angeles' });
  assert.deepEqual(listed, { items: [{ date: '2026-09-08', weight: { value: 151.2, unit: 'lb' } }, { date: '2026-09-10', weight: { value: 150, unit: 'lb' } }] });
});

test('a unit January adds later is passed through unchanged in responses', async () => {
  const { client } = makeClient(() => ({ body: { items: [{ date: '2026-09-10', weight: { value: 10.5, unit: 'st' } }] } }));
  const listed = await client.weightLogs.list({ endUserId: 'u', start: '2026-09-10', end: '2026-09-10' });
  assert.equal(listed.items[0].weight.unit, 'st');
});

test('water and weight inputs are validated before any request is sent', async () => {
  const { client, requests } = makeClient(() => ({ body: {} }));
  await assert.rejects(client.waterLogs.create({ endUserId: 'u', amount: { value: 8, unit: 'cups' } }), /amount\.unit must be one of fl_oz, ml, cup/);
  await assert.rejects(client.waterLogs.create({ endUserId: 'u', amount: { value: 0, unit: 'ml' } }), /amount\.value must be a positive number/);
  await assert.rejects(client.waterLogs.create({ endUserId: 'u', amount: { value: 8, unit: 'ml' }, consumedAt: 'yesterday' }), /consumedAt must be an ISO-8601 date-time/);
  await assert.rejects(client.waterLogs.list({ endUserId: 'u', start: '2026-09-01', end: '2026-09-10', unit: 'cups' }), /unit must be one of fl_oz, ml, cup/);
  await assert.rejects(client.waterLogs.list({ endUserId: 'u', start: '09/01/2026', end: '2026-09-10', unit: 'ml' }), /start must be an ISO-8601 date/);
  await assert.rejects(client.weightLogs.create({ endUserId: 'u', weight: { value: 150, unit: 'stone' } }), /weight\.unit must be one of lb, kg/);
  await assert.rejects(client.weightLogs.create({ endUserId: 'u', weight: { value: Number.NaN, unit: 'kg' } }), /weight\.value must be a positive number/);
  await assert.rejects(client.weightLogs.list({ endUserId: 'u', start: '2026-09-01', end: 'today' }), /end must be an ISO-8601 date/);
  await assert.rejects(client.waterLogs.list({ endUserId: 'u', start: '2026-02-31', end: '2026-03-10', unit: 'ml' }), /start must be an ISO-8601 date/);
  await assert.rejects(client.weightLogs.list({ endUserId: 'u', start: '2026-09-01', end: '2026-09-31' }), /end must be an ISO-8601 date/);
  assert.equal(requests.length, 0);
});

test('the daily water cap and the date-range limit are validation errors', async () => {
  const { client } = makeClient((url) => url.pathname === '/v1.2/water-logs' && url.search === ''
    ? { status: 400, body: { code: 'daily_water_limit_exceeded', message: 'This log would take the day past 24 L.' } }
    : { status: 400, body: { code: 'date_range_too_large', message: 'start_date may be at most 5 years ago.' } });
  await assert.rejects(client.waterLogs.create({ endUserId: 'u', amount: { value: 800, unit: 'fl_oz' } }), (error) => {
    assert.ok(error instanceof JanuaryError);
    assert.equal(error.category, 'validation');
    assert.equal(error.code, 'daily_water_limit_exceeded');
    assert.equal(error.status, 400);
    return true;
  });
  await assert.rejects(client.weightLogs.list({ endUserId: 'u', start: '2016-01-01', end: '2026-09-10' }), (error) => {
    assert.equal(error.category, 'validation');
    assert.equal(error.code, 'date_range_too_large');
    return true;
  });
});

test('a food-log update sends only the fields that were set and rejects an empty patch', async () => {
  const { client, requests } = makeClient(() => ({ body: { id: '00000000-0000-0000-0000-000000000001', foods: [], eaten_at: '2026-08-25T16:30:00Z', name: 'Lunch' } }));
  await client.foodLogs.update({ endUserId: 'u', logId: '00000000-0000-0000-0000-000000000001', name: 'Lunch' });
  assert.deepEqual(requests[0].body, { name: 'Lunch' });
  await assert.rejects(client.foodLogs.update({ endUserId: 'u', logId: '00000000-0000-0000-0000-000000000001' }), /at least one of foods, timestampUtc, or name/);
  assert.equal(requests.length, 1);
});
