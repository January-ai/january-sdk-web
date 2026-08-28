# First request

This standalone Node.js smoke script constructs the provider and client, fetches
a short-lived token from your backend, calls January, and prints food names. It
uses the npm package installed in the [installation guide](installation.md).

## 1. Create the script

Create `january-quickstart.mjs` in the consuming ESM project:

```js
import {
  JanuaryError,
  JanuaryClient,
  JanuaryTokenProviderError,
} from '@januaryai/sdk';

const tokenUrl = process.env.JANUARY_TOKEN_URL;
const sessionToken = process.env.PARTNER_SESSION_TOKEN;
const endUserId = process.env.JANUARY_END_USER_ID;

if (!tokenUrl) throw new Error('JANUARY_TOKEN_URL is required');
if (!sessionToken) throw new Error('PARTNER_SESSION_TOKEN is required');
if (!endUserId) throw new Error('JANUARY_END_USER_ID is required');

async function fetchJanuaryToken() {
  let response;
  try {
    response = await fetch(tokenUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
    });
  } catch (error) {
    throw new JanuaryTokenProviderError(
      'Token endpoint is unavailable',
      { retryable: true, cause: error },
    );
  }

  if (!response.ok) {
    throw new JanuaryTokenProviderError(
      `Token endpoint returned HTTP ${response.status}`,
      { retryable: response.status === 408 || response.status === 429 || response.status >= 500 },
    );
  }
  return response.json();
}

const january = new JanuaryClient({
  clientTokenProvider: fetchJanuaryToken,
});
const user = january.forUser(
  endUserId,
  Intl.DateTimeFormat().resolvedOptions().timeZone,
);

try {
  const response = await user.foods.search({
    query: 'greek yogurt',
    limit: 5,
  });

  console.log(`Connected: ${response.totalCount} matches`);
  for (const food of response.items) console.log(`- ${food.name}`);
} catch (error) {
  if (error instanceof JanuaryError) {
    console.error('January request failed', {
      category: error.category,
      status: error.status,
      code: error.code,
      requestId: error.requestId,
      message: error.message,
    });
  } else {
    console.error('Integration failed:', error);
  }
  process.exitCode = 1;
}
```

## 2. Run it

Use an HTTPS partner endpoint that returns a production client token:

```bash
JANUARY_TOKEN_URL=https://your-backend.example/january-token \
PARTNER_SESSION_TOKEN=YOUR_APP_SESSION_TOKEN \
JANUARY_END_USER_ID=YOUR_STABLE_USER_ID \
node january-quickstart.mjs
```

Expected output:

```text
Connected: <number> matches
- <food name>
- <food name>
```

The exact count and foods vary. A failure exits nonzero and prints either the
typed January error fields or the token-endpoint error. Remove command-line
session tokens from shell history after this smoke test. Browser applications
should use the same provider shape with an authenticated same-origin endpoint;
see [Authentication](authentication.md) for cookie/CORS guidance.
