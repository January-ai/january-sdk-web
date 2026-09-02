# Runtime and security boundaries

The Web SDK targets browser runtimes. The authenticated application backend
owns private token exchange and may proxy January API operations when required.

| Component | Credential | Rule |
| --- | --- | --- |
| Browser | `clientTokenProvider` or current `accessToken` | Requires January to enable the exact web origin |
| Application backend | Partner API key | Never expose this credential or token-exchange logic to browser code |

The SDK uses the runtime's Fetch implementation and ships ESM only. Browser use
requires modern Fetch APIs. `preparePhotoScanImage` additionally requires DOM
image, canvas, `Blob`, and object-URL APIs.

{% hint style="danger" %}
Runtime compatibility is not the same as API-origin access. The production
Partner API currently rejects a generic browser CORS preflight, so a browser
cannot call January directly by default. Before using the SDK in browser code,
obtain confirmation from January that your exact production and development
origins are enabled. Until then, route January API operations through the
authenticated application backend and have the browser call that route.
{% endhint %}

Keep application-session and token-endpoint configuration appropriate to each
runtime. A framework's environment-variable prefix is not a secret boundary if
it exposes values to client JavaScript.

Client-token mode strips `x-end-user-id` because the token itself identifies the
user. The host application still owns stable identity for token issuance and
scoped-resource context.
