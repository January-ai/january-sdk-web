# January Partner SDK for Node.js

Build personalized nutrition experiences with the January Partner API. The
Node.js SDK provides fully typed, Promise-based APIs for server-side TypeScript
applications.

## Requirements

- Node.js 22 or later
- ESM (`import`) projects

## Installation

```sh
npm install @januaryai/partner-sdk
```

## Quick start

```ts
import {
  JanuaryError,
  JanuaryPartnerClient,
} from '@januaryai/partner-sdk';

const january = new JanuaryPartnerClient({
  apiKey: process.env.JANUARY_API_KEY!,
});

const results = await january.foods.search({
  query: 'greek yogurt',
  endUserId: 'your-user-id',
});

for (const food of results.items) {
  console.log(food.name);
}
```

## User-scoped requests

The host application owns and persists its account identity. Create a lightweight scoped client to apply that stable ID and timezone automatically to Food Logs and Glucose requests:

```ts
const user = january.forUser({
  endUserId: authenticatedAccount.id,
  endUserTimezone: authenticatedAccount.timezone,
});

await user.foodLogs.create({
  foods: [breakfast.selection, coffee.selection],
  timestampUtc: new Date().toISOString(),
});

await user.foodLogs.list({ start: '2026-08-23', end: '2026-08-29' });
```

List dates are inclusive calendar dates. Create and update accept the complete array of foods and normalize ISO-8601 meal timestamps to UTC.

## Browser meal-photo preparation

`preparePhotoScanImage` is a browser-safe, React-independent helper. It applies browser-exposed image orientation, preserves aspect ratio, limits the longest edge to 1,000 pixels by default, JPEG-compresses at 0.7 quality, and returns an upload-ready data URI.

```ts
const prepared = await preparePhotoScanImage(file);
const scan = await january.photoScanning.scan({ image: prepared.dataUri });
```

## Cancellation

Pass an `AbortSignal` with any request:

```ts
const controller = new AbortController();

const request = january.foods.search({
  query: 'greek yogurt',
  signal: controller.signal,
});

controller.abort();
await request;
```

## API resources

- `foods` — autocomplete, food details, search, barcode lookup, natural-language search, and alternatives
- `restaurants` — restaurant and menu search
- `photoScanning` — meal-photo scanning and corrections
- `foodLogs` — create, retrieve, update, and delete food logs
- `glucose` — glucose prediction

## Serving and nutrition calculations

Use `FoodPortion` with a complete food returned by `foods.getFood`. It validates
the serving and quantity, scales nutrition consistently, and provides the exact
food selection accepted by food-log and glucose requests.

```ts
import { FoodPortion } from '@januaryai/partner-sdk';

const food = await january.foods.getFood({ foodId: result.id });
const portion = FoodPortion.from(food, {
  servingId: food.servings[0].id,
  quantity: 1.5,
});

console.log(portion.nutrition.calories?.value);
console.log(portion.selection);
```

## Error handling

SDK requests throw `JanuaryError`, which provides a category, message, and HTTP
status when available.

```ts
try {
  const results = await january.foods.search(request);
  // Use results
} catch (error) {
  if (error instanceof JanuaryError) {
    console.error(error.category, error.message);
  }
}
```

## Authentication

Long-lived API keys are for trusted server environments only. Load them from a
secret manager or process environment, and never expose them to browser or
mobile clients.

A web app may instead use a short-lived token returned by its authenticated
backend. If your app manages refresh itself, recreate the SDK client when the
token changes:

```ts
const january = new JanuaryPartnerClient({ accessToken });
const user = january.forUser(partnerUserId);
```

For automatic refresh, supply a callback or an object implementing
`JanuaryTokenProvider`:

```ts
const january = new JanuaryPartnerClient({
  clientTokenProvider: async () => {
    return partnerBackend.createJanuaryToken();
  },
});
```

Failed provider fetches use bounded exponential backoff with jitter. The default
makes nine total attempts: the initial fetch plus eight retries. Browser
`AbortError` cancellations stop immediately. Customize the policy when creating
the client:

```ts
const january = new JanuaryPartnerClient({
  clientTokenProvider: () => partnerBackend.createJanuaryToken(),
  tokenRetryPolicy: {
    maximumAttempts: 9,
    initialDelayMs: 1_000,
    multiplier: 2,
    maximumDelayMs: 8_000,
    jitterRatio: 0.2,
  },
});
```

The provider accepts the stable partner-backend response as-is:
`{ token, expiresIn }`. It also tolerates January's snake-case
`{ token, expires_in }` response. The provider owns its endpoint URL, request
method, session authentication, and headers; the SDK never guesses or defaults
that URL.

Provider tokens are kept only in memory, refreshed 60 seconds before
expiration, and shared across concurrent requests. An HTTP 401 whose JSON body
has `code: "token_expired"` invalidates the cached token and replays the January
API operation at most once. The retry policy applies to fetching its replacement
token, not repeatedly replaying the API operation. Other authentication errors
are surfaced without retrying. Client-token requests do not send
`x-end-user-id`, because the token already identifies the end user.

## Documentation

See the [January Partner API documentation](https://docs.january.ai/nutrition/apis/v1.2/).
