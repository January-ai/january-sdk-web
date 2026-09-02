# January Web SDK

Official browser SDK for January food discovery, restaurants, food analysis,
food logs, and glucose prediction in TypeScript web applications. This is the
Web SDK; January's future Node.js server SDK is a separate product.

## Install from source

```bash
git clone https://github.com/January-ai/january-sdk-web.git
cd january-sdk-web
npm ci
npm test
npm pack
```

Install the resulting tarball in your application and commit the lockfile:

```bash
npm install /path/to/januaryai-sdk-0.1.0.tgz
```

See the [installation guide](https://docs.january.ai/web-and-node.js-sdk/web-sdk/getting-started/installation)
for package and runtime requirements.

## Documentation

The [Web SDK GitBook](https://docs.january.ai/web-and-node.js-sdk/web-sdk) covers the
runtime security boundary, backend token exchange, complete provider code, first
request, all resources, retries, cancellation, packaging, testing, and support.

## Quick start

```ts
import { JanuaryClient } from '@januaryai/sdk';

const january = new JanuaryClient({
  clientTokenProvider: async () => {
    const response = await fetch('/api/january-token', { credentials: 'include' });
    if (!response.ok) throw new Error(`Token endpoint returned ${response.status}`);
    return response.json(); // { token: 'ct-…', expiresIn: 1800 }
  },
});
```

## Authentication rule

Production authentication uses client tokens. A browser application uses a
short-lived token returned by its own authenticated backend. Start with
the [backend token endpoint](https://docs.january.ai/web-and-node.js-sdk/web-sdk/getting-started/backend-token-endpoint).

Development API-key authentication is available for local testing only and
prints a runtime warning. Never ship a partner API key in a browser bundle or
production application.

## Set the active user once

Create one lightweight scoped client after authentication and use it across
every resource:

```ts
const user = january.forUser({
  endUserId: authenticatedAccount.stableId,
  endUserTimezone: 'America/New_York',
});

const foods = await user.foods.search({ query: 'banana' });
const logs = await user.foodLogs.list({ start: '2026-08-01', end: '2026-08-31' });
```

The scoped client exposes Foods, Restaurants, Photo Scanning, Food Logs, and
Glucose. Recreate it when the signed-in account changes.

## Menu items by restaurant ID

Use the ID of a `restaurant` search result to load its menu, independently of search text and location.

```ts
const page = await client.restaurants.getMenuItems({ restaurantId: restaurant.id, limit: 100, offset: 0 });
```

The response contains `items` and `totalCount` (`total_count` on the wire). Request subsequent pages by advancing `offset` by the number of items received, until it reaches the total or a page is empty. An unknown restaurant returns 404; an existing restaurant with no menu returns an empty list.

## License

The Apache 2.0 license applies to the source code in this repository. It does not grant rights to nutrition data, food images, or other content returned by the January API, which are subject to the January API Developer Terms.
