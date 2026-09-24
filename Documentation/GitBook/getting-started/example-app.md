# React example app

The [Web SDK repository](https://github.com/January-ai/january-sdk-web) includes `examples/react-demo`, a TanStack Start app that uses every part of the SDK. It calls January from server functions (`src/api/january.functions.ts`), so it runs without origin enablement.

## Run it

1. In the [Developer Dashboard](https://dashboard.january.ai), create an API key under **API keys → Create key**, then switch on **Enable client tokens** under [Client tokens](https://dashboard.january.ai/dashboard/client-tokens). Without the switch, minting fails with `403`.
2. Start the [token relay](https://docs.january.ai/docs/authentication#develop-with-the-token-relay) and paste the key when it asks. Leave it running.

   ```bash
   git clone https://github.com/January-ai/january-token-relay.git
   cd january-token-relay
   ./start.sh
   ```

3. In a second terminal, clone the SDK and start the demo. The copied `.env.local` already points at the relay.

   ```bash
   git clone https://github.com/January-ai/january-sdk-web.git
   cd january-sdk-web
   npm ci
   cp .env.example .env.local
   cd examples/react-demo
   npm ci
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) and search for `banana`.

## How it gets tokens

The demo's server code posts to `PARTNER_TOKEN_URL` (the relay) with the demo user's ID in the `January-End-User-ID` header; `JANUARY_END_USER_ID` sets the default user. That header goes only to the relay, and the SDK strips it from calls to January. Your production endpoint takes the user from the app session instead ([Backend token endpoint](backend-token-endpoint.md)). The API key stays in the relay and never reaches the browser.

To use a relay deployed to Vercel, set `PARTNER_TOKEN_URL` to its HTTPS token URL and `PARTNER_APP_SESSION_TOKEN` to its `RELAY_TOKEN` in `.env.local`. See the [relay deployment guide](https://github.com/January-ai/january-token-relay#optional-deploy-to-vercel).

## What it shows

Search for foods, barcodes, restaurants, and menu items (with voice input); food details, portions, and alternatives; photo and description scans with corrections; a daily view of meals, water, and weight with charts; meal history; and glucose prediction.

**Next:** [Core concepts](https://docs.january.ai/web-sdk/concepts)
