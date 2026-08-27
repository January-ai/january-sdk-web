# Client and resources

`JanuaryPartnerClient` accepts exactly one authentication option:

| Runtime | Option |
| --- | --- |
| Browser/app-managed refresh | `clientTokenProvider` plus optional `tokenRetryPolicy` |
| Host-managed short-lived token | `accessToken` |
| Trusted server only | `apiKey` |

```ts
new JanuaryPartnerClient(
  | { apiKey: string; fetch?: typeof globalThis.fetch }
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

Provider mode requires a nonblank token whose finite lifetime is greater than
the 60-second refresh leeway.

All modes accept an optional custom `fetch` implementation. The public client
always targets January production; no public base URL or token endpoint exists.

| Resource | Public operations |
| --- | --- |
| `foods` | `autocomplete`, `search`, `getFood`, `lookupBarcode`, `searchNaturalLanguage`, `suggestAlternatives` |
| `restaurants` | `search`, `searchMenuItems` |
| `photoScanning` | `scan`, `correct` |
| `foodLogs` | `create`, `list`, `update`, `delete` |
| `glucose` | `predict` |

`forUser(context)` and `forUser(endUserId, timezone?)` return a lightweight
`JanuaryPartnerUserClient` for scoped Food Logs and Glucose. Every public
request type accepts an optional `AbortSignal`.

Local helpers include `FoodPortion.from(...)` and browser-only
`preparePhotoScanImage(...)`. Generated OpenAPI transport modules are package
internals and are not exported from the package root.

```ts
forUser(context: PartnerUserContext): JanuaryPartnerUserClient
forUser(endUserId: string, endUserTimezone?: string): JanuaryPartnerUserClient
```

`JanuaryTokenRetryPolicy` fields are optional. Defaults are nine total attempts,
1,000 ms initial delay, multiplier 2, 8,000 ms cap, and jitter ratio 0.2. See
[Retries, refresh, and cancellation](retries-and-lifecycle.md).
