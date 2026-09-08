# React example app

`examples/react-demo` is a full-stack TanStack Start application demonstrating
shared UI, autocomplete, hydrated servings, browser photo preparation, food
logs, glucose prediction, user context, imperial/metric controls, and local voice
capture for food and restaurant search.

## Install and configure

```bash
cd examples/react-demo
npm ci
```

For the standalone local token relay, use these server-side defaults:

```text
PARTNER_TOKEN_URL=http://127.0.0.1:8787/api/january/client-token
JANUARY_END_USER_ID=january-sdk-demo-user
```

`PARTNER_TOKEN_URL` has no default. The demo sends a server-side `POST` with the
selected stable user ID in `January-End-User-ID`. A production provider instead
sends the app's normal session to its authenticated backend, which derives the
user ID server-side. The public SDK exposes no January base-URL override. Never
use a browser-exposed variable for server credentials.

For a hosted development relay, set `PARTNER_TOKEN_URL` to the relay's Vercel
HTTPS token URL and `PARTNER_APP_SESSION_TOKEN` to its `RELAY_TOKEN`. Follow the
[relay deployment guide](https://github.com/January-ai/january-token-relay#optional-deploy-to-vercel).
This is for development and testing only; production must use your authenticated
backend.

## Run and verify

```bash
npm test
npm run build
npm run dev
```

Open the printed local URL. Verify connection, autocomplete → search, complete
servings, voice capture → transcript, photo scan, Food Logs, Glucose, and
account/timezone changes. Browser
developer tools must not show server-side token-issuance credentials in source, network requests, or
storage.
