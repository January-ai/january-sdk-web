# January Web SDK

The official January SDK for food discovery, restaurants, food analysis, food
logs, and glucose prediction in TypeScript web applications.

## Install

```bash
npm install @januaryai/web-sdk
```

See the [installation guide](https://docs.january.ai/web-sdk/getting-started/installation)
for package and runtime requirements.

## Documentation

The [Web SDK GitBook](https://docs.january.ai/web-sdk) covers the
runtime security boundary, backend token exchange, complete provider code, first
request, all resources, retries, cancellation, packaging, testing, and support.

## Quick start

```ts
import { JanuaryClient } from '@januaryai/web-sdk';

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
the [backend token endpoint](https://docs.january.ai/web-sdk/getting-started/backend-token-endpoint).

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

## Capture a voice query

`VoiceCaptureSession` is a framework-free browser helper that captures microphone
input for transcription and publishes live state, duration, audio level, and
partial-transcript updates. A completed capture returns the transcript and
duration; the SDK does not retain or return recorded audio.

```ts
import { VoiceCaptureSession } from '@januaryai/web-sdk';

const voice = new VoiceCaptureSession();
const unsubscribe = voice.subscribe((snapshot) => {
  renderRecordingState(snapshot);
});

await voice.start({ language: 'en-US' });
const capture = await voice.stop();
searchInput.value = capture.transcript ?? '';

unsubscribe();
voice.dispose();
```

Use voice capture only from a user gesture, serve the app over HTTPS (localhost
is accepted for local development), and provide a typed-search fallback. See the
[voice capture guide](Documentation/GitBook/guides/voice-capture.md).

## Menu items by restaurant ID

Use the ID of a `restaurant` search result to load its menu, independently of search text and location.

```ts
const page = await client.restaurants.getMenuItems({ restaurantId: restaurant.id, limit: 100, offset: 0 });
```

The response contains `items` and `totalCount` (`total_count` on the wire). Request subsequent pages by advancing `offset` by the number of items received, until it reaches the total or a page is empty. An unknown restaurant returns 404; an existing restaurant with no menu returns an empty list.

## License

The Apache 2.0 license applies to the source code in this repository. It does not grant rights to nutrition data, food images, or other content returned by the January API, which are subject to the January API Developer Terms.
