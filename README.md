# January SDK for Web and Node.js

Official TypeScript SDK for January food discovery, restaurants,
food analysis, food logs, and glucose prediction.

## Install

```bash
npm install @januaryai/sdk
```

## Documentation

The [Web and Node.js SDK GitBook](Documentation/GitBook/README.md) covers the
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

Production authentication uses client tokens. A browser or Node.js client
uses a short-lived token returned by its own authenticated backend. Start with
the [backend token endpoint](Documentation/GitBook/getting-started/backend-token-endpoint.md).

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
