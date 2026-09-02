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

For the production-shaped token flow, provide explicit server-side environment
configuration:

```text
PARTNER_TOKEN_URL=http://localhost:8787/january-token
PARTNER_APP_SESSION_TOKEN=your-local-app-session-or-relay-secret
JANUARY_END_USER_ID=your-test-user
```

`PARTNER_TOKEN_URL` has no default. The demo sends a server-side `POST` with the
app session in `Authorization` and the selected stable user ID in
`x-end-user-id`; adapt those details to your backend contract. The public SDK
exposes no January base-URL override. Never use a browser-exposed variable for
server credentials.

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
