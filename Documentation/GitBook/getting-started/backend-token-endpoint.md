# Backend token endpoint

Expose an authenticated endpoint in your own backend that completes January's
private server-side token exchange and returns a short-lived token bound to the
signed-in user. The public SDK begins with that client token.

## Stable browser-facing response

The SDK accepts either JSON shape:

```json
{ "token": "ct-…", "expiresIn": 1800 }
```

```json
{ "token": "ct-…", "expires_in": 1800 }
```

The lifetime must be greater than 60 seconds. Your host, path, method, cookies,
headers, and application authentication are deliberately not standardized by
the client SDK.

## Backend responsibilities

1. Authenticate the application session.
2. Resolve the stable end-user ID server-side.
3. Complete the private server-side onboarding integration supplied by January.
4. Return only the short-lived token response.
5. Enforce TLS, authorization, rate limits, audit events, and secret rotation.

Never accept an unauthenticated arbitrary user ID and mint a token for it. Never
log server-side credentials or client tokens, and never expose token-issuance
credentials through a `PUBLIC_`, `VITE_`, or browser-bundled environment variable.

January may provide a local stand-in backend during onboarding. It is scaffolding
only; switching to a real endpoint must require changing app configuration, not
SDK token-lifecycle code.
