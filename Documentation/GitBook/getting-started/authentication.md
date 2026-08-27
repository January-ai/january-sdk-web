# Authentication

Use exactly one credential option when creating `JanuaryPartnerClient`.

## Browser: provider-backed client

This mode is valid only after January confirms that the exact browser origin is
enabled for the Partner API. A generic origin is not accepted today. If your
origin is not enabled, keep `JanuaryPartnerClient` in a trusted Node.js route
and call that route from the browser instead.

```ts
import {
  JanuaryPartnerClient,
  type JanuaryClientTokenResponse,
} from '@januaryai/partner-sdk';

async function fetchJanuaryToken(): Promise<JanuaryClientTokenResponse> {
  const response = await fetch('/api/january-token', {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Token endpoint returned HTTP ${response.status}`);
  }

  return response.json() as Promise<JanuaryClientTokenResponse>;
}

export const january = new JanuaryPartnerClient({
  clientTokenProvider: fetchJanuaryToken,
});
```

The relative URL belongs to this example application, not the SDK. Inject an
explicit environment-specific endpoint when the token server is on another
origin, configure CORS and credentials correctly for both the partner token
endpoint and the January API origin, and fail app setup if it is missing.

## Fixed short-lived token

Use `accessToken` only when the host application owns refresh and recreates the
client after token changes:

```ts
const january = new JanuaryPartnerClient({ accessToken: clientToken });
```

## Trusted Node.js service

A server process may use a long-lived partner key loaded from a secret manager
or private environment variable:

```ts
const apiKey = process.env.JANUARY_API_KEY;
if (!apiKey) throw new Error('JANUARY_API_KEY is required');

const january = new JanuaryPartnerClient({ apiKey });
```

Never instantiate that client in code reachable by a browser bundle. See
[Retries, refresh, and cancellation](../reference/retries-and-lifecycle.md).
