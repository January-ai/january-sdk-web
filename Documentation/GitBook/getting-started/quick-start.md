# First request

This browser example constructs the provider and client, fetches a short-lived
token from your authenticated backend, calls January, and renders food names. It
uses the package installed in the [installation guide](installation.md).

## 1. Add the request to your web application

Create `src/january-quickstart.ts` in the consuming web project. Replace the
example user ID with the stable ID from your authenticated application session.

```ts
import {
  JanuaryError,
  JanuaryClient,
  JanuaryTokenProviderError,
  type JanuaryClientTokenResponse,
} from '@januaryai/web-sdk';

const endUserId = 'replace-with-your-stable-user-id';

async function fetchJanuaryToken(): Promise<JanuaryClientTokenResponse> {
  let response: Response;
  try {
    response = await fetch('/api/january/token', {
      method: 'POST',
      // The server must also return Cache-Control: no-store.
      cache: 'no-store',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
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
  return (await response.json()) as JanuaryClientTokenResponse;
}

const january = new JanuaryClient({
  clientTokenProvider: fetchJanuaryToken,
});
const user = january.forUser(
  endUserId,
  Intl.DateTimeFormat().resolvedOptions().timeZone,
);

export async function renderJanuaryQuickStart(output: HTMLElement) {
  try {
    const response = await user.foods.search({
      query: 'greek yogurt',
      limit: 5,
    });

    output.style.whiteSpace = 'pre-line';
    output.textContent = response.items.map((food) => food.name).join('\n');
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
    throw error;
  }
}
```

## 2. Run it

Call the exported function from a page after the user session is available, then
start the application's normal development server:

```ts
import { renderJanuaryQuickStart } from './january-quickstart';

const output = document.querySelector<HTMLElement>('#january-results');
if (output) {
  void renderJanuaryQuickStart(output).catch(() => {
    // renderJanuaryQuickStart already logs the typed January error details.
  });
}
```

The page renders the returned food names inside `#january-results`. The exact
count and foods vary. Failures throw after logging the typed January error fields
or the token-endpoint error.

Use an authenticated same-origin token endpoint; see
[Authentication](authentication.md) for cookie and CORS guidance.
