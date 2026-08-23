# January Partner SDK for Node.js

Server-side TypeScript SDK for January Partner API v1.2. Every operation returns a native `Promise` and accepts an optional `AbortSignal`.

```ts
import { JanuaryPartnerClient } from '@januaryai/partner-sdk';

const january = new JanuaryPartnerClient({ apiKey: process.env.JANUARY_API_KEY! });
const results = await january.foods.search({
  query: 'greek yogurt',
  endUserId: 'your-user-id',
});
```

This package is for trusted server environments. Do not embed a bearer API key in browser or mobile code.

## Verify

```sh
npm test
npm run check:generated
npm run pack:check
```

The public SDK covers all 13 v1.2 operations across Foods, Restaurants, Photo
Scanning, Food Logs, and Glucose. `AbortSignal` cancellation is passed directly
to `fetch`.

`Contract/sdk-contract.lock.json` pins release 1.2.0 and archive SHA-256
`959ab95b4a95218fd4e3948ac0841748ec81534eb1c4476c8165920e94a3e361`.
Regenerate the internal transport with `npm run check:generated` or
`./scripts/generate-transport.sh`.
