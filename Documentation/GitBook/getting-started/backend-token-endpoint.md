# Backend token endpoint

A browser must never receive a long-lived January partner key. Expose an
authenticated endpoint in your own backend that exchanges the server-held key
for a short-lived token bound to the signed-in user.

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
3. Exchange the protected January partner key using the server-side onboarding
   integration supplied by January.
4. Return only the short-lived token response.
5. Enforce TLS, authorization, rate limits, audit events, and secret rotation.

Never accept an unauthenticated arbitrary user ID and mint a token for it. Never
log keys or client tokens, and never expose the partner key through a `PUBLIC_`,
`VITE_`, or browser-bundled environment variable.

January may provide a local stand-in backend during onboarding. It is scaffolding
only; switching to a real endpoint must require changing app configuration, not
SDK token-lifecycle code.
