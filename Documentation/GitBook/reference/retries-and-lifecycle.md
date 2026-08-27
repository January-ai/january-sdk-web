# Retries, refresh, and cancellation

Provider-backed clients cache credentials in memory, refresh 60 seconds early,
and coalesce concurrent refreshes into one provider call. Provider exceptions
use nine total attempts with ±20% jitter and nominal delays of 1, 2, 4, 8, 8,
8, 8, and 8 seconds.

```ts
const january = new JanuaryPartnerClient({
  clientTokenProvider: fetchJanuaryToken,
  tokenRetryPolicy: {
    maximumAttempts: 9,
    initialDelayMs: 1_000,
    multiplier: 2,
    maximumDelayMs: 8_000,
    jitterRatio: 0.2,
  },
});
```

Only HTTP `401` with `code: 'token_expired'` invalidates the token and replays
the January request, once. Other authentication failures, authorization errors,
rate limits, and server errors stop. The retry policy applies to token fetching,
not arbitrary API requests.

Every public request accepts `signal`:

```ts
const controller = new AbortController();
const request = january.foods.search({ query: 'banana', signal: controller.signal });
controller.abort();
await request; // rejects with AbortError
```

Provider-thrown `AbortError` is not retried. Do not add an unbounded outer retry
loop.
