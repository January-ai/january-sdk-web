# January SDK React demo

A full-stack React and TypeScript demo built with TanStack Start, TanStack
Router, and TanStack Query. It uses short-lived client tokens; the January API
key stays in a separate local server and is never included in the browser bundle.

The Search screen also demonstrates local browser voice capture. Press the
microphone beside a food or restaurant query to record, transcribe when
supported, cancel, and stop. The demo uses only the transcript and never
displays or sends the captured audio.

## Run locally

After you [sign up](https://dashboard.january.ai/sign-up) or
[sign in](https://dashboard.january.ai/sign-in), complete both dashboard steps:

1. Open **API keys → Create key** and copy the full `sk-…` value.
2. Open [Client tokens](https://dashboard.january.ai/dashboard/client-tokens)
   and select **Enable client tokens**.

Start the local server from the
[`january-server-sdk-node`](https://github.com/January-ai/january-server-sdk-node)
repository:

```sh
git clone https://github.com/January-ai/january-server-sdk-node.git
cd january-server-sdk-node
npm ci
cp .env.example .env
# Edit .env and set JANUARY_API_KEY.
npm run demo:token-server
```

Leave it running. From the Web SDK repository root, configure and run the demo
in a second terminal:

```sh
npm ci
cp .env.example .env.local
cd examples/react-demo
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The authentication card
shows the local relay status and lets you mint or revoke the fixed demo user's
client tokens. Search for `banana` to make the first SDK request.

Allow microphone access when the Search screen requests it. Voice capture needs
a secure context; localhost is accepted for this local flow.

The authentication boundary in `src/api/january.server.ts` calls the configured
token endpoint, returns its `{ token, expiresIn }` response directly, and lets
the SDK cache and refresh it. Replacing the local server later only changes the
demo configuration/provider; January API calls remain pinned to production.

## Optional debug-only shortcut

To skip client-token minting, omit `PARTNER_TOKEN_URL` from `.env.local` and set
`JANUARY_API_KEY=sk-your-server-api-key` plus
`JANUARY_END_USER_ID=january-sdk-demo-user`. The key remains in the demo's server
functions and is not bundled into browser code. Never use a `VITE_` prefix or
commit the key.
