# Example app

`examples/react-demo` is a full-stack TanStack Start application. It demonstrates
shared UI components, search autocomplete, hydrated servings, browser image
preparation, food logs, glucose prediction, persisted user context, and
imperial/metric controls.

Install and run it:

```bash
cd examples/react-demo
npm install
npm run dev
```

For token mode, provide explicit server-side environment configuration:

```text
PARTNER_TOKEN_URL=https://your-backend.example/january-token
JANUARY_INTERNAL_API_BASE_URL=https://your-january-development-origin.example
JANUARY_END_USER_ID=your-test-user
```

These development-origin settings belong only to the January-owned demo. The
public SDK has no URL override and is pinned to January production. Server
functions keep trusted credentials and token exchange logic out of the browser
bundle.
