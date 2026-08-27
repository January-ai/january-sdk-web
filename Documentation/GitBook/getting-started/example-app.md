# React example app

`examples/react-demo` is a full-stack TanStack Start application demonstrating
shared UI, autocomplete, hydrated servings, browser photo preparation, food
logs, glucose prediction, user context, and imperial/metric controls.

## Install and configure

```bash
cd examples/react-demo
npm ci
```

For the production-shaped token flow, provide explicit server-side environment
configuration:

```text
PARTNER_TOKEN_URL=http://localhost:8787/january-token
JANUARY_END_USER_ID=your-test-user
```

`PARTNER_TOKEN_URL` has no default, and the public SDK exposes no January
base-URL override. Keep application-session configuration in the appropriate
server environment; never use a browser-exposed variable for server credentials.

## Run and verify

```bash
npm test
npm run build
npm run dev
```

Open the printed local URL. Verify connection, autocomplete → search, complete
servings, photo scan, Food Logs, Glucose, and account/timezone changes. Browser
developer tools must not show server-side token-issuance credentials in source, network requests, or
storage.
