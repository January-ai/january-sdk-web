# Client lifecycle

Create one `JanuaryClient` for each signed-in user and reuse it. The client caches that user's client token and refreshes it when needed; `forUser` scoped clients share that cache.

A scoped client doesn't change the token. `forUser({ endUserId: 'bob' })` on Alice's client keeps sending Alice's token until it expires, and January answers as Alice. So on sign-out or an account switch, discard the client and create a new one:

```ts
import type { JanuaryClient, JanuaryPartnerUserClient } from '@januaryai/web-sdk';
import { createJanuaryClient } from './january';

let current: { endUserId: string; client: JanuaryClient } | undefined;

// Returns the scoped client for the signed-in user.
export function januaryUser(endUserId: string): JanuaryPartnerUserClient {
  if (current?.endUserId !== endUserId) {
    // A different user: the old client would keep sending the previous user's token.
    current = { endUserId, client: createJanuaryClient() };
  }
  return current.client.forUser({
    endUserId,
    endUserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

// Call on sign-out.
export function signOutOfJanuary(): void {
  current = undefined;
}
```

`createJanuaryClient` comes from [Authentication](../getting-started/authentication.md). In React, keep the client in state owned by a component keyed by the end-user ID, so an account switch replaces it.

* **Scoped clients are cheap.** Create a new one when the timezone changes; keep the same `JanuaryClient`.
* **Don't create a client per request or render.** Each new client starts with an empty cache and calls your token endpoint again.
* **Nothing to close.** A client holds no connections or timers; drop your references to it. To stop requests in flight, pass an `AbortSignal` ([Retries, refresh, and cancellation](../reference/retries-and-lifecycle.md)).
