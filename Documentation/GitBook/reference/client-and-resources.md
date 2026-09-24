# Client and resources

`JanuaryClient` takes exactly one authentication option:

| Option | Use |
| --- | --- |
| `clientTokenProvider`, plus optional `tokenRetryPolicy` | The SDK fetches, caches, and refreshes client tokens ([Authentication](../getting-started/authentication.md)). |
| `accessToken` | One `ct-…` client token your app refreshes itself; create a new client when it changes. |

```ts
new JanuaryClient(
  | { accessToken: string; fetch?: typeof globalThis.fetch }
  | {
      clientTokenProvider: JanuaryTokenProvider | JanuaryTokenProviderCallback;
      tokenRetryPolicy?: JanuaryTokenRetryPolicy;
      fetch?: typeof globalThis.fetch;
    }
)

interface JanuaryTokenProvider {
  fetchClientToken(): Promise<JanuaryClientTokenResponse>;
}

type JanuaryTokenProviderCallback =
  () => Promise<JanuaryClientTokenResponse>;

type JanuaryClientTokenResponse =
  | { token: string; expiresIn: number }
  | { token: string; expires_in: number };
```

The provider must return a nonblank token with a finite lifetime over 60 seconds, the refresh leeway. `fetch` replaces the Fetch implementation. The client always calls January's production API; there is no base-URL option. The token cache belongs to the client, so use one client per signed-in user ([Client lifecycle](../concepts/client-lifecycle.md)).

`JanuaryTokenRetryPolicy` fields are all optional; the defaults are in [Retries, refresh, and cancellation](retries-and-lifecycle.md).

## Resources

| Resource | Operations |
| --- | --- |
| `foods` | `autocomplete`, `search`, `get`, `lookupBarcode`, `suggestAlternatives` |
| `restaurants` | `search`, `searchMenuItems`, `getMenuItems` |
| `foodAnalysis` | `analyzePhoto`, `analyzeDescription`, `correct` |
| `foodLogs` | `create`, `list`, `getSummary`, `get`, `update`, `delete` |
| `waterLogs` | `create`, `list`, `delete` |
| `weightLogs` | `create`, `list` |
| `glucose` | `predict` |

The scope each operation needs is in [Backend token endpoint](../getting-started/backend-token-endpoint.md#what-the-web-sdk-needs). Every request accepts an optional `signal: AbortSignal`. Errors are described in [Error handling](error-handling.md) and, for the API's codes, in [REST errors](https://docs.january.ai/rest-api/api-overview#errors).

## Scoped clients

```ts
forUser(context: PartnerUserContext): JanuaryPartnerUserClient
forUser(endUserId: string, endUserTimezone?: string): JanuaryPartnerUserClient
```

`forUser` returns a `JanuaryPartnerUserClient` with the same seven resources, bound to one end-user ID and timezone. Prefer the object form, and use the scoped client for every call.

The resources on `JanuaryClient` itself take the same requests plus the user context: log requests require `endUserId` and accept `endUserTimezone`, and glucose requests accept both. Food, restaurant, and food-analysis requests keep an optional `endUserId` only for source compatibility; the SDK never sends it. With a client token, the SDK sends no end-user ID on any call.

## Local helpers

`FoodPortion.from(...)` ([Foods API](foods-api.md#portion-helper)) and the browser-only `preparePhotoScanImage(...)` ([Restaurants and food analysis API](discovery-and-scanning-api.md#browser-image-helper)) run without a network call. `VoiceCaptureSession` is described in [Voice capture](../guides/voice-capture.md).
