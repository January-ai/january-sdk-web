# Authentication

`JanuaryClient` gets client tokens from a provider function you write. The provider calls your [token endpoint](backend-token-endpoint.md) and returns its response; the SDK caches the token and calls the provider again shortly before it expires.

{% hint style="warning" %}
**Browser calls need an enabled origin.** January accepts browser requests only from web origins it has enabled for your account, including `http://localhost:<port>` for development. Until yours are enabled, make January calls from your server. See [Runtime and security boundaries](../concepts/runtime-boundaries.md).
{% endhint %}

## Add a token provider

Save this as `src/january.ts`; later pages import it.

```ts
import {
  JanuaryClient,
  JanuaryTokenProviderError,
  type JanuaryClientTokenResponse,
} from '@januaryai/web-sdk';
import { getAppSession } from './session'; // your app's sign-in state

// Your token endpoint. With the token relay:
// 'http://localhost:8787/api/january/client-token'
const tokenEndpoint = '/api/january/client-token';

export async function fetchJanuaryToken(): Promise<JanuaryClientTokenResponse> {
  // Read the session on every call: it changes when someone else signs in.
  const session = await getAppSession();

  let response: Response;
  try {
    response = await fetch(tokenEndpoint, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
        // Only the token relay reads this header. Your production endpoint
        // takes the user from the session and ignores it.
        'January-End-User-ID': session.endUserId,
      },
    });
  } catch (error) {
    // Network failure or timeout.
    throw new JanuaryTokenProviderError('Token endpoint unreachable', {
      retryable: true,
      cause: error,
    });
  }

  if (!response.ok) {
    throw new JanuaryTokenProviderError(`Token endpoint returned ${response.status}`, {
      retryable: response.status === 408 || response.status === 429 || response.status >= 500,
    });
  }

  const body = (await response.json().catch(() => null)) as JanuaryClientTokenResponse | null;
  if (typeof body?.token !== 'string') {
    throw new JanuaryTokenProviderError('Token endpoint returned an unreadable body');
  }
  return body;
}

// Create one client per signed-in user: it caches that user's token.
export function createJanuaryClient(): JanuaryClient {
  return new JanuaryClient({ clientTokenProvider: fetchJanuaryToken });
}
```

`getAppSession` stands for however your app reads its signed-in user. If your app session is a cookie, drop the `Authorization` header: a same-origin request sends the cookie, and a cross-origin request needs `credentials: 'include'`.

When a different user signs in, create a new client; see [Client lifecycle](../concepts/client-lifecycle.md).

## Develop with the token relay

Until your endpoint exists, point `tokenEndpoint` at the [token relay](https://docs.january.ai/docs/authentication#develop-with-the-token-relay): `http://localhost:8787/api/january/client-token`. Because the page and the relay are on different origins, the relay must allow yours: add your development server's origin to the relay's `.env`, for example `ALLOWED_ORIGINS=http://localhost:5173`, and restart it.

Never put an API key in browser code. `VITE_`, `NEXT_PUBLIC_`, and `PUBLIC_` variables are shipped to every visitor.

## When the provider fails

| Provider result | Retried? | What the request rejects with |
| --- | --- | --- |
| Throws `JanuaryTokenProviderError` with `retryable: true` | Yes, per the [retry policy](../reference/retries-and-lifecycle.md) | `JanuaryError` with category `authentication` once the attempts run out; the last provider error is in `cause` |
| Throws anything else, including a non-retryable `JanuaryTokenProviderError` | No | `JanuaryError` with category `transport`; your error is in `cause` |
| Returns an empty token, or a lifetime of 60 seconds or less | No | `JanuaryError` with category `authentication` |

An `AbortError` thrown by the provider isn't retried and reaches the caller unchanged.

## Fixed token

If your app manages token refresh itself, pass a `ct-…` client token as `accessToken`, and create a new client each time the token changes:

```ts
const january = new JanuaryClient({ accessToken: clientToken });
```

**Next:** [First request](quick-start.md)
