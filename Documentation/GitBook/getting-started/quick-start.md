# First request

This page searches foods from the browser and renders the names.

{% hint style="warning" %}
**Before you begin:**

* January has enabled every origin this page runs on, including `http://localhost:<port>`. Send your January contact the exact scheme, host, and port of each.
* Your token endpoint, or the token relay, returns a token with the `foods:read` scope.

Until your origin is enabled, this request fails with category `transport` and a CORS error in the browser console. Make January calls from your server instead: see [Runtime and security boundaries](../concepts/runtime-boundaries.md).
{% endhint %}

## 1. Add the request

Create `src/january-quickstart.ts` next to the `src/january.ts` from [Authentication](authentication.md):

```ts
import { JanuaryError } from '@januaryai/web-sdk';
import { createJanuaryClient } from './january';
import { getAppSession } from './session';

const january = createJanuaryClient();

export async function renderJanuaryQuickStart(output: HTMLElement): Promise<void> {
  const session = await getAppSession();
  const user = january.forUser({
    endUserId: session.endUserId,
    endUserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  try {
    const { items } = await user.foods.search({ query: 'greek yogurt', limit: 5 });
    output.textContent = items.map((food) => food.name).join(', ');
  } catch (error) {
    if (error instanceof JanuaryError) {
      console.error('January request failed', {
        category: error.category,
        status: error.status,
        code: error.code,
        requestId: error.requestId,
        cause: error.cause,
      });
    }
    throw error;
  }
}
```

The token decides which user January acts for; the SDK doesn't send `endUserId` to January. Still set it to your opaque user ID, never an email address or name ([User identity and timezone](../concepts/user-context.md)).

## 2. Run it

Call the function once the user is signed in, then start your development server:

```ts
import { renderJanuaryQuickStart } from './january-quickstart';

const output = document.querySelector<HTMLElement>('#january-results');
if (output) {
  renderJanuaryQuickStart(output).catch(() => {
    // renderJanuaryQuickStart already logged the error.
  });
}
```

`#january-results` shows up to five food names. If the request fails, the console shows the error's category, status, code, request ID, and cause; [Error handling](../reference/error-handling.md) says what each category means.

**Next:** [React example app](example-app.md)
