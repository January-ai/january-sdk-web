# Authentication and security

Use exactly one credential option:

* `clientTokenProvider` for automatically refreshed browser or app clients;
* `accessToken` when the application owns the short-lived-token lifecycle; or
* `apiKey` only in a trusted server process.

```ts
const january = new JanuaryPartnerClient({
  clientTokenProvider: async () => {
    const response = await fetch(config.januaryTokenUrl, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Token exchange failed');
    return response.json();
  },
});
```

The stable response is `{ token, expiresIn }`; `expires_in` is also accepted.
The provider owns its URL, method, session authentication, and headers. The SDK
has no token-endpoint default and never receives the partner secret.

Tokens are cached only in memory, refreshed 60 seconds before expiration, and
shared across concurrent calls. Provider failures get nine total attempts with
±20% jitter and nominal delays of 1, 2, 4, 8, 8, 8, 8, and 8 seconds.

```ts
const january = new JanuaryPartnerClient({
  clientTokenProvider: () => partnerBackend.createJanuaryToken(),
  tokenRetryPolicy: {
    maximumAttempts: 9,
    initialDelayMs: 1_000,
    multiplier: 2,
    maximumDelayMs: 8_000,
    jitterRatio: 0.2,
  },
});
```

Only `401` with `code: 'token_expired'` triggers a refresh and one replay.
`AbortError` cancellation and all other authentication failures stop immediately.
Client-token requests omit `x-end-user-id` because the token identifies the user.
