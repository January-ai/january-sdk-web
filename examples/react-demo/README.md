# January SDK React demo

A full-stack React and TypeScript demo built with TanStack Start, TanStack
Router, and TanStack Query. January API requests run in server functions so the
development API key is never included in the browser bundle.

The Search screen also demonstrates local browser voice capture. Press the
microphone beside a food or restaurant query to record, transcribe when supported,
cancel, and stop. The demo uses only the transcript and never displays or sends
the captured audio.

## Run locally

From the SDK repository root, add the development credential to `.env.local`:

```sh
JANUARY_API_KEY=your-development-key
JANUARY_END_USER_ID=your-test-user-id
```

Then install and run the demo:

```sh
cd examples/react-demo
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
Allow microphone access when the Search screen requests it. Voice capture needs
a secure context; localhost is accepted for this local flow.

To exercise the short-lived-token provider against January's production token
exchange, copy the repository's example environment file and replace the local
placeholders:

```sh
cp ../../.env.example ../../.env.local

JANUARY_API_KEY=sk-your-development-key
PARTNER_TOKEN_URL=http://127.0.0.1:8787/january-token
JANUARY_END_USER_ID=local-web-user
```

Start the API-key relay in one terminal:

```sh
npm run dev:token-relay
```

Then run `npm run dev` in another terminal. The relay binds only to
`127.0.0.1` and exchanges `JANUARY_API_KEY` at
`POST https://partners.january.ai/v1.2/auth/client-tokens`.

The authentication boundary in `src/api/january.server.ts` calls the explicit
token endpoint, returns its `{ token, expiresIn }` response directly, and lets
the SDK cache and refresh it. The URL has no SDK default: replacing the stand-in
backend later only changes this demo configuration/provider. January API calls
remain pinned to production.
