# Runtime and security boundaries

The same client-token surface supports two runtimes:

| Runtime | Credential | Rule |
| --- | --- | --- |
| Browser | `clientTokenProvider` or current `accessToken` | Requires January to enable the exact web origin |
| Trusted Node.js service | `clientTokenProvider` or current `accessToken` | May call January without browser CORS constraints |

The SDK uses the runtime's Fetch implementation and ships ESM only. Browser use
requires modern Fetch APIs. `preparePhotoScanImage` additionally requires DOM
image, canvas, `Blob`, and object-URL APIs.

{% hint style="danger" %}
Runtime compatibility is not the same as API-origin access. The production
Partner API currently rejects a generic browser CORS preflight, so a browser
cannot call January directly by default. Before using the SDK in browser code,
obtain confirmation from January that your exact production and development
origins are enabled. Until then, call the SDK from a trusted Node.js route and
have the browser call that application route.
{% endhint %}

Keep application-session and token-endpoint configuration appropriate to each
runtime. A framework's environment-variable prefix is not a secret boundary if
it exposes values to client JavaScript.

Client-token mode strips `x-end-user-id` because the token itself identifies the
user. The host application still owns stable identity for token issuance and
scoped-resource context.
