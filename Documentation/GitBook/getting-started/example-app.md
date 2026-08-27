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
JANUARY_INTERNAL_API_BASE_URL=https://partners.dev.january.ai
JANUARY_END_USER_ID=your-test-user
```

These values are demo development tooling. `PARTNER_TOKEN_URL` has no default,
and the internal January base-URL override does not exist in the public SDK.
Keep secrets in the server environment; never use a browser-exposed variable.

## Run and verify

```bash
npm test
npm run build
npm run dev
```

Open the printed local URL. Verify connection, autocomplete → search, complete
servings, photo scan, Food Logs, Glucose, and account/timezone changes. Browser
developer tools must not show a partner key in source, network requests, or
storage.
