import assert from 'node:assert/strict';
import test from 'node:test';
import { JanuaryPartnerClient } from '../dist/index.js';

test('food search sends authentication, user context, and SDK identity', async () => {
  let captured;
  const fetch = async (input, init) => {
    captured = { url: String(input), init };
    return new Response(JSON.stringify({ total_count: 0, items: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const client = new JanuaryPartnerClient({
    apiKey: 'test-key',
    fetch,
  });
  const result = await client.foods.search({
    query: 'greek yogurt',
    endUserId: 'partner-user-1',
    limit: 5,
  });

  assert.deepEqual(result, { totalCount: 0, items: [] });
  assert.match(captured.url, /^https:\/\/partners\.january\.ai\/v1\.2\/foods\?/);
  assert.match(captured.url, /query=greek%20yogurt/);
  assert.match(captured.url, /limit=5/);
  const headers = new Headers(captured.init.headers);
  assert.equal(headers.get('authorization'), 'Bearer test-key');
  assert.equal(headers.get('x-end-user-id'), 'partner-user-1');
  assert.match(headers.get('user-agent'), /^JanuaryPartnerSDK-Node\/0\.1\.0/);
});
