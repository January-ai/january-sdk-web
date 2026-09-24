# Backend token endpoint

Your web app gets client tokens from an endpoint on your backend. The endpoint is the same for every January SDK: it checks the app session, mints a token for that user with your API key, and returns January's response. Build it from [Your token endpoint](https://docs.january.ai/docs/authentication#your-token-endpoint).

{% hint style="info" %}
No backend yet? Run the [token relay](https://docs.january.ai/docs/authentication#develop-with-the-token-relay) and continue to [Authentication](authentication.md). Come back before launch.
{% endhint %}

## What the Web SDK needs

* **Client tokens switched on.** Minting fails with `403 forbidden` until **Enable client tokens** is on in the [Developer Dashboard → Client tokens](https://dashboard.january.ai/dashboard/client-tokens).
* **January's response, unchanged.** The SDK reads `token` and `expires_in` from it and ignores the other fields. It also accepts `expiresIn`, so `{ "token": "ct-…", "expiresIn": 1800 }` works too. It rejects a lifetime of 60 seconds or less, because it refreshes 60 seconds before expiry; every lifetime January issues (300–7200 seconds) passes.
* **Every scope the app uses.** One token serves every resource on the client, so mint it with the scopes of every feature your app calls. A call outside them fails with `403 scope_insufficient`.

| Web SDK calls | Scopes |
| --- | --- |
| `foods.*` | `foods:read` |
| `restaurants.*` | `restaurants:read` |
| `foodAnalysis.*` | `food_analysis:write` |
| `foodLogs.list`, `get`, `getSummary` / `create`, `update`, `delete` | `food_logs:read` / `food_logs:write` |
| `waterLogs.list` / `create`, `delete` | `water_logs:read` / `water_logs:write` |
| `weightLogs.list` / `create` | `weight_logs:read` / `weight_logs:write` |
| `glucose.predict` | `glucose:read` |

Voice capture, `FoodPortion`, and `preparePhotoScanImage` run locally and need no scope. The API-level list is in the [scope table](https://docs.january.ai/rest-api/authentication#client-token-scopes).

## Example: Next.js route handler

```ts
// app/api/january/client-token/route.ts (Next.js App Router, runs on your server)
import { getSession } from '@/lib/auth'; // your app's authentication

export async function POST(): Promise<Response> {
  const session = await getSession();
  if (!session) return new Response(null, { status: 401 });

  const minted = await fetch('https://partners.january.ai/v1.2/auth/client-tokens', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.JANUARY_API_KEY}`, // server-only; never NEXT_PUBLIC_
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      end_user_id: session.user.id, // from the session, never from the request
      scopes: ['foods:read', 'food_analysis:write', 'food_logs:read', 'food_logs:write'],
      ttl_seconds: 1800,
    }),
  });

  // January's body and status, unchanged: the status tells the SDK whether to retry.
  return new Response(await minted.text(), {
    status: minted.status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
```

A same-origin route like this needs no CORS setup. If your token endpoint is on another origin, allow your app's origin there and the `Authorization` and `January-End-User-ID` request headers.

**Next:** [Authentication](authentication.md)
