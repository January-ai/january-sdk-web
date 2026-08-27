# January SDK React demo

A full-stack React and TypeScript demo built with TanStack Start, TanStack
Router, and TanStack Query. January API requests run in server functions so the
development API key is never included in the browser bundle.

## Run locally

From the SDK repository root, add the development credential to `.env.local`:

```sh
JANUARY_DEV_API_KEY=your-development-key
JANUARY_END_USER_ID=your-test-user-id
```

Then install and run the demo:

```sh
cd examples/react-demo
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To exercise the short-lived-token provider instead, configure a partner token
endpoint and remove the API-key setting:

```sh
PARTNER_TOKEN_URL=http://127.0.0.1:8787/january-token
JANUARY_INTERNAL_API_BASE_URL=https://partners.dev.january.ai
JANUARY_END_USER_ID=local-web-user
```

The authentication boundary in `src/api/january.server.ts` requires both URLs,
calls the explicit token endpoint, returns its `{ token, expiresIn }` response
directly, and lets the SDK
cache and refresh it. The URL has no SDK default: replacing the stand-in backend
later only changes this demo configuration/provider. The partner route must
return a token accepted by the configured January development API. The API URL
override lives only in this January-owned demo; the public SDK remains pinned to
January production.
