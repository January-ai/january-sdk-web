# Retries, refresh, and cancellation

## Token refresh

A provider-backed client keeps the token in memory, fetches a new one 60 seconds before it expires, and shares one provider call among concurrent requests. The cache belongs to the client, so create one client per signed-in user ([Client lifecycle](../concepts/client-lifecycle.md)).

Only a `401` with code `token_expired` makes the SDK drop the token, fetch a new one, and replay the request, once. Other authentication and authorization failures, rate limits, and server errors aren't retried. The SDK doesn't retry API requests on its own, so don't wrap calls in an unbounded retry loop.

## Provider retry policy

When the provider throws `JanuaryTokenProviderError` with `retryable: true`, the SDK calls it again with exponential backoff. Other provider errors fail the request at once ([how provider failures surface](../getting-started/authentication.md#when-the-provider-fails)). The defaults:

```ts
const january = new JanuaryClient({
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

That is nine attempts with nominal waits of 1, 2, 4, 8, 8, 8, 8, and 8 seconds, ±20%. With the defaults, a request can wait about 47 seconds before it fails while your token endpoint is down. For interactive UIs, consider `tokenRetryPolicy: { maximumAttempts: 3 }`. An `AbortError` thrown by the provider isn't retried.

## Cancellation

Every request accepts `signal`:

```ts
const controller = new AbortController();
const request = user.foods.search({ query: 'banana', signal: controller.signal });
controller.abort();
await request; // rejects with an AbortError
```

A canceled request rejects with an `AbortError`, not with a `JanuaryError`. Check the error's `name` or your signal's `aborted` flag to tell cancellation from a failure ([Error handling](error-handling.md#cancellation)).
