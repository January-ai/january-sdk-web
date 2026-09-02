# Authentication

Use a client-token provider or one fixed short-lived client token when creating `JanuaryClient`.

## Browser: provider-backed client

This mode is valid only after January confirms that the exact browser origin is
enabled for the Partner API. A generic origin is not accepted today. If your
origin is not enabled, route January API operations through your authenticated
application backend instead.

```ts
import {
  JanuaryClient,
  JanuaryTokenProviderError,
  type JanuaryClientTokenResponse,
} from '@januaryai/web-sdk';

async function fetchJanuaryToken(): Promise<JanuaryClientTokenResponse> {
  const response = await fetch('/api/january-token', {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new JanuaryTokenProviderError(
      `Token endpoint returned HTTP ${response.status}`,
      { retryable: response.status === 408 || response.status === 429 || response.status >= 500 },
    );
  }

  return response.json() as Promise<JanuaryClientTokenResponse>;
}

export const january = new JanuaryClient({
  clientTokenProvider: fetchJanuaryToken,
});
```

The relative URL belongs to this example application, not the SDK. Inject an
explicit environment-specific endpoint when the token server is on another
origin, configure CORS and credentials correctly for both the partner token
endpoint and the January API origin, and fail app setup if it is missing.

Only throw `JanuaryTokenProviderError` with `retryable: true` for failures that
can reasonably recover, such as timeouts, rate limits, and server errors. The
SDK does not retry ordinary exceptions, authentication failures, or malformed
token responses.

## Fixed short-lived token

Use `accessToken` only when the host application owns refresh and recreates the
client after token changes:

```ts
const january = new JanuaryClient({ accessToken: clientToken });
```

See [Retries, refresh, and cancellation](../reference/retries-and-lifecycle.md)
for provider refresh and client lifecycle behavior.

## Local development API key

For local development only, a partner can initialize the client with
`developmentApiKey`. The SDK prints a warning whenever this authentication mode
is first used in a process.

```ts
const january = new JanuaryClient({
  developmentApiKey: '<local-development-key>',
});
```

Never ship this mode in a browser bundle or production application. Production
code must use a client-token provider so the partner key remains on a trusted
server.
