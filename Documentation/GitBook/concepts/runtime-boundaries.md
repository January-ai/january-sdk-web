# Runtime and security boundaries

{% hint style="danger" %}
**A browser can call January only from origins January has enabled for your account.** January rejects the CORS preflight from any other origin, so the request never reaches the API. Send your January contact the exact scheme, host, and port of every origin you use, for example `https://app.example.com` and `http://localhost:5173`. Until they're enabled, make January calls from your server.
{% endhint %}

| Where the code runs | Package | Credential |
| --- | --- | --- |
| Browser, on an origin January has enabled | `@januaryai/web-sdk` | Client token from your [token endpoint](../getting-started/backend-token-endpoint.md) |
| Browser, origin not enabled | `@januaryai/web-sdk` only for `FoodPortion`, `preparePhotoScanImage`, `VoiceCaptureSession`, and types; API calls go to your server | None |
| Your server (route handler, server action, server function) | `@januaryai/web-sdk` with a client token your server mints, as the [React example](../getting-started/example-app.md) does; or `@januaryai/server` with your API key | API key, in a server environment variable only |

When your server makes the January calls, your browser code calls your own routes, and your server applies the same session checks it uses for the token endpoint.

The API key never goes to the browser, in any form. A request that fails because of the origin looks like a network error; see [Troubleshooting](../reference/troubleshooting.md#browser-request-fails-during-cors-preflight).
