# January SDK for Web

The official TypeScript SDK for January food discovery, restaurants, food
analysis, food logs, and glucose prediction in browser applications.

## Quick start: run the demo with client tokens

You can try the Web SDK before your own backend is ready. The standalone
January Token Relay keeps the January API key out of the browser and
temporarily stands in for your production token endpoint.

You need two terminal windows: one for the January Token Relay, which holds
your API key and hands the app short-lived client tokens, and one for the
demo. The first run takes about ten minutes.

### Terminal 1: start the token relay

1. Open a terminal.
2. Download the relay and move into its folder. Install Node.js 22 or newer
   first: this SDK needs 22, and the relay itself needs 20.12:

   ```bash
   git clone https://github.com/January-ai/january-token-relay.git
   cd january-token-relay
   ```

3. Start it:

   ```bash
   ./start.sh
   ```

   It checks your Node version and then asks
   `Paste your API key (input is hidden):`. Leave it waiting and create the
   key in the next two steps.

4. Create the API key. In a browser,
   [sign up](https://dashboard.january.ai/sign-up) or
   [sign in](https://dashboard.january.ai/sign-in) to the January Developer
   Dashboard, open **API keys → Create key**, and copy the full `sk-…` value.
   It is shown once.
5. Enable client tokens. Open
   [Client tokens](https://dashboard.january.ai/dashboard/client-tokens) and
   switch on **Enable client tokens**. Until this is on, January answers the
   relay with `403`.
6. Back in Terminal 1, paste the key and press Enter. Nothing appears while
   you type. You should see:

   ```text
   ✓ API key accepted by January (sk-abcd…wxyz)
   ✓ Saved to .env (readable only by you; git ignores it)

   January Token Relay is running on this machine (development only).
     Endpoint      http://localhost:8787/api/january/client-token
   ```

   Leave this window open for the whole session. The key is saved in a
   git-ignored `.env`, so the next `./start.sh` starts without asking.

### Terminal 2: run the Web demo

7. Open a second terminal.
8. Download the SDK repository and move into it:

   ```bash
   git clone https://github.com/January-ai/january-sdk-web.git
   cd january-sdk-web
   ```

9. Install and start the React demo. Its environment template already points
   at the relay:

   ```bash
   npm ci
   cp .env.example .env.local
   cd examples/react-demo
   npm ci
   npm run dev
   ```

10. Open [http://localhost:3000](http://localhost:3000) and search for
    `banana`. Terminal 1 prints `minted=true status=200` the first time the
    page asks for a token. Neither the API key nor a long-lived credential is
    in the browser bundle.

Never put the `sk-…` key in browser code or a client-side environment
variable.

### Optional: deploy the relay to Vercel

If localhost is inconvenient, follow the relay's
[Vercel deployment guide](https://github.com/January-ai/january-token-relay#deploy).
Set `JANUARY_API_KEY` and a long random `RELAY_TOKEN` in Vercel, then update the
root `.env.local` file:

```dotenv
PARTNER_TOKEN_URL=https://YOUR-PROJECT.vercel.app/api/january/client-token
PARTNER_APP_SESSION_TOKEN=YOUR_RELAY_TOKEN
JANUARY_END_USER_ID=january-sdk-demo-user
```

These values are read by the demo's server function, not added to the browser
bundle. The hosted relay is still for development and testing only; its static
relay token is not a substitute for authenticating your users.

This relay is only for development. In production, keep the SDK token provider
but point it to your authenticated backend, which verifies the app session and
derives the end-user ID server-side.

## Add the SDK to your app

### 1. Install

```bash
npm install @januaryai/web-sdk
```

### 2. Connect and make the first request

```ts
import { JanuaryClient } from '@januaryai/web-sdk';

const january = new JanuaryClient({
  clientTokenProvider: async () => {
    const response = await fetch('/api/january/client-token', {
      method: 'POST',
      cache: 'no-store',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Token endpoint returned ${response.status}`);
    }
    return response.json();
  },
});

const user = january.forUser({
  endUserId: session.user.id,
  endUserTimezone: 'America/New_York',
});

const foods = await user.foods.search({ query: 'banana' });
console.log(`Found ${foods.items.length} foods`);
```

The endpoint URL, HTTP method, and session mechanism belong to your app; they
are not fixed by the SDK. The included demo uses the local endpoint documented
earlier.

A successful request prints a result count; an empty result is still a successful
connection. Reuse the user-scoped client and recreate it when the signed-in
account changes.

Direct browser calls also require January to enable the exact browser origin.
If that origin is not enabled, make January API calls from your authenticated
backend instead.

Your production endpoint returns `{ "token": "ct-…", "expiresIn": 1800 }`
(the SDK also accepts `expires_in`),
derives the stable end-user ID from the verified app session, and chooses scopes
on the server. See the
[backend token endpoint guide](Documentation/GitBook/getting-started/backend-token-endpoint.md)
for the complete contract.

## Common tasks

- [Foods](Documentation/GitBook/guides/foods.md)
- [Restaurants](Documentation/GitBook/guides/restaurants.md)
- [Photo scanning](Documentation/GitBook/guides/photo-scanning.md)
- [Food logs](Documentation/GitBook/guides/food-logs.md)
- [Glucose prediction](Documentation/GitBook/guides/glucose-prediction.md)
- [Voice capture](Documentation/GitBook/guides/voice-capture.md)

For every resource, retries, cancellation, packaging, testing, and
troubleshooting, see the [complete Web SDK guide](Documentation/GitBook/README.md).

## Development

To work on the SDK itself:

```bash
npm ci
npm test
```

## Optional: fastest debug-only shortcut

If you only want to make a request immediately, the full-stack demo can keep a
server API key in its local server functions and skip client-token minting. This
does not put the key in the browser bundle, but it bypasses the recommended
client-token flow above. In `.env.local`, omit `PARTNER_TOKEN_URL` and set:

```dotenv
JANUARY_API_KEY=sk-your-server-api-key
JANUARY_END_USER_ID=january-sdk-demo-user
```

Then run the React demo normally. Never use a `VITE_` prefix, commit the key, or
move it into browser code. Use client tokens when the browser will call January
directly.

## License

Apache 2.0. January API data and content remain subject to the January API
Developer Terms.
