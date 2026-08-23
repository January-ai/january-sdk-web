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

- `foods` — food search, barcode lookup, natural-language search, and alternatives
- `restaurants` — restaurant and menu search
- `photoScanning` — meal-photo scanning and corrections
- `foodLogs` — create, retrieve, update, and delete food logs
- `glucose` — glucose prediction

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

Use this SDK only in trusted server environments. Load API credentials from a
secret manager or process environment, and never expose them to browser or
mobile clients.

## Documentation

See the [January Partner API documentation](https://docs.january.ai/nutrition/apis/v1.2/).
