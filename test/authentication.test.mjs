import assert from 'node:assert/strict';
import test from 'node:test';
import { JanuaryError, JanuaryPartnerClient } from '../dist/index.js';
import { resolveTokenRetryPolicy, retryDelay } from '../dist/client.js';

const ok = () => new Response(JSON.stringify({ total_count: 0, items: [] }), {
  status: 200,
  headers: { 'content-type': 'application/json' },
});

test('fixed client token is injected', async () => {
  let authorization;
  let endUserId;
  const client = new JanuaryPartnerClient({
    accessToken: 'ct-fixed',
    fetch: async (_input, init) => {
      authorization = new Headers(init.headers).get('authorization');
      endUserId = new Headers(init.headers).get('x-end-user-id');
      return ok();
    },
  });

  await client.foods.search({ query: 'banana', endUserId: 'ignored-with-client-token' });
  assert.equal(authorization, 'Bearer ct-fixed');
  assert.equal(endUserId, null);
});

test('provider token is cached and refreshed once after token_expired', async () => {
  let providerCalls = 0;
  const authorizations = [];
  let requestCalls = 0;
  const client = new JanuaryPartnerClient({
    clientTokenProvider: async () => ({
      token: providerCalls++ === 0 ? 'ct-one' : 'ct-two',
      expiresIn: 3_600,
    }),
    fetch: async (_input, init) => {
      authorizations.push(new Headers(init.headers).get('authorization'));
      requestCalls += 1;
      if (requestCalls === 2) {
        return new Response(JSON.stringify({ message: 'expired', code: 'token_expired' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        });
      }
      return ok();
    },
  });

  await client.foods.search({ query: 'banana' });
  await client.foods.search({ query: 'apple' });

  assert.equal(providerCalls, 2);
  assert.deepEqual(authorizations, ['Bearer ct-one', 'Bearer ct-one', 'Bearer ct-two']);
});

test('concurrent requests share one provider refresh', async () => {
  let providerCalls = 0;
  const client = new JanuaryPartnerClient({
    clientTokenProvider: async () => {
      providerCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { token: 'ct-shared', expires_in: 3_600 };
    },
    fetch: async () => ok(),
  });

  await Promise.all([
    client.foods.search({ query: 'banana' }),
    client.foods.search({ query: 'apple' }),
    client.foods.search({ query: 'pear' }),
  ]);
  assert.equal(providerCalls, 1);
});

test('provider fetch retries with bounded exponential backoff', async () => {
  let providerCalls = 0;
  const client = new JanuaryPartnerClient({
    clientTokenProvider: async () => {
      providerCalls += 1;
      if (providerCalls <= 2) throw new Error('temporary partner backend failure');
      return { token: 'ct-recovered', expiresIn: 3_600 };
    },
    tokenRetryPolicy: {
      maximumAttempts: 9,
      initialDelayMs: 0,
      multiplier: 2,
      maximumDelayMs: 0,
      jitterRatio: 0,
    },
    fetch: async (_input, init) => {
      assert.equal(new Headers(init.headers).get('authorization'), 'Bearer ct-recovered');
      return ok();
    },
  });

  await client.foods.search({ query: 'banana' });
  assert.equal(providerCalls, 3);
});

test('provider fetch stops after the configured maximum attempts', async () => {
  let providerCalls = 0;
  const client = new JanuaryPartnerClient({
    clientTokenProvider: async () => {
      providerCalls += 1;
      throw new Error('partner backend unavailable');
    },
    tokenRetryPolicy: {
      maximumAttempts: 9,
      initialDelayMs: 0,
      maximumDelayMs: 0,
      jitterRatio: 0,
    },
    fetch: async () => {
      assert.fail('January API fetch must not run without a token');
    },
  });

  await assert.rejects(
    client.foods.search({ query: 'banana' }),
    (error) => error instanceof JanuaryError
      && error.category === 'authentication'
      && error.message.includes('after 9 attempts'),
  );
  assert.equal(providerCalls, 9);
});

test('token_expired refresh uses provider backoff before one API replay', async () => {
  let providerCalls = 0;
  let requestCalls = 0;
  const authorizations = [];
  const client = new JanuaryPartnerClient({
    clientTokenProvider: async () => {
      providerCalls += 1;
      if (providerCalls === 1) return { token: 'ct-expired', expiresIn: 3_600 };
      if (providerCalls <= 3) throw new Error('temporary partner backend failure');
      return { token: 'ct-refreshed', expiresIn: 3_600 };
    },
    tokenRetryPolicy: {
      maximumAttempts: 9,
      initialDelayMs: 0,
      maximumDelayMs: 0,
      jitterRatio: 0,
    },
    fetch: async (_input, init) => {
      requestCalls += 1;
      authorizations.push(new Headers(init.headers).get('authorization'));
      if (requestCalls === 1) {
        return new Response(JSON.stringify({ message: 'expired', code: 'token_expired' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        });
      }
      return ok();
    },
  });

  await client.foods.search({ query: 'banana' });
  assert.equal(providerCalls, 4);
  assert.equal(requestCalls, 2);
  assert.deepEqual(authorizations, ['Bearer ct-expired', 'Bearer ct-refreshed']);
});

test('concurrent callers share one provider retry sequence', async () => {
  let providerCalls = 0;
  const client = new JanuaryPartnerClient({
    clientTokenProvider: async () => {
      providerCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      if (providerCalls === 1) throw new Error('temporary partner backend failure');
      return { token: 'ct-shared', expiresIn: 3_600 };
    },
    tokenRetryPolicy: {
      maximumAttempts: 9,
      initialDelayMs: 0,
      maximumDelayMs: 0,
      jitterRatio: 0,
    },
    fetch: async () => ok(),
  });

  await Promise.all([
    client.foods.search({ query: 'banana' }),
    client.foods.search({ query: 'apple' }),
    client.foods.search({ query: 'pear' }),
  ]);
  assert.equal(providerCalls, 2);
});

test('malformed provider tokens fail without retrying', async () => {
  let providerCalls = 0;
  const client = new JanuaryPartnerClient({
    clientTokenProvider: async () => {
      providerCalls += 1;
      return { token: '  ', expiresIn: 3_600 };
    },
    fetch: async () => assert.fail('January API fetch must not run without a valid token'),
  });

  await assert.rejects(
    client.foods.search({ query: 'banana' }),
    (error) => error instanceof JanuaryError && error.category === 'authentication',
  );
  assert.equal(providerCalls, 1);
});

test('AbortError cancellation is never retried', async () => {
  let providerCalls = 0;
  const client = new JanuaryPartnerClient({
    clientTokenProvider: async () => {
      providerCalls += 1;
      throw new DOMException('Canceled', 'AbortError');
    },
    fetch: async () => assert.fail('January API fetch must not run after cancellation'),
  });

  await assert.rejects(
    client.foods.search({ query: 'banana' }),
    (error) => error?.name === 'AbortError',
  );
  assert.equal(providerCalls, 1);
});

test('invalid retry policy fails at client construction', () => {
  assert.throws(
    () => new JanuaryPartnerClient({
      clientTokenProvider: async () => ({ token: 'ct-token', expiresIn: 3_600 }),
      tokenRetryPolicy: { maximumAttempts: 0 },
    }),
    /maximumAttempts/,
  );
});

test('default retry policy uses one-second exponential delays capped at eight seconds', () => {
  const policy = resolveTokenRetryPolicy();

  assert.equal(policy.maximumAttempts, 9);
  assert.deepEqual(
    Array.from({ length: 8 }, (_, index) => retryDelay(policy, index + 1, 0.5)),
    [1_000, 2_000, 4_000, 8_000, 8_000, 8_000, 8_000, 8_000],
  );
  assert.equal(retryDelay(policy, 1, 0), 800);
  assert.equal(retryDelay(policy, 1, 1), 1_200);
});

test('token_invalid is surfaced without refreshing', async () => {
  let providerCalls = 0;
  let requestCalls = 0;
  const client = new JanuaryPartnerClient({
    clientTokenProvider: async () => {
      providerCalls += 1;
      return { token: 'ct-invalid', expiresIn: 3_600 };
    },
    fetch: async () => {
      requestCalls += 1;
      return new Response(JSON.stringify({ message: 'invalid', code: 'token_invalid' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  await assert.rejects(
    client.foods.search({ query: 'banana' }),
    (error) => error?.code === 'token_invalid',
  );
  assert.equal(providerCalls, 1);
  assert.equal(requestCalls, 1);
});
