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

Start the standalone
[January Token Relay](https://github.com/January-ai/january-token-relay):

```sh
git clone https://github.com/January-ai/january-token-relay.git
cd january-token-relay
./start.sh
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
shows the local relay status and lets you mint a fresh client token. Search for
`banana` to make the first SDK request, open it, and choose **Find food
alternatives** for suggestions shaped by dietary restrictions and preferences.
A photo or description scan can be corrected with a short note, such as "it was
two eggs, not three". The Tracking screen shows one day at
a time: the day's meals with their totals, water with the day's total, and the
day's weight, each with a log action. Below the water and weight cards, charts
show the last week, month, or year ending today: daily water totals as bars
(monthly totals for a year) and weight as a line in the card's unit. The Year
view asks `waterLogs.list` / `weightLogs.list` in consecutive ranges of up to 90
days, because each call returns at most 100 days. The Logs screen lists meal history over
a date range.

To use a hosted development relay instead, follow its
[Vercel guide](https://github.com/January-ai/january-token-relay#deploy)
and set `PARTNER_TOKEN_URL` to the deployed HTTPS token URL plus
`PARTNER_APP_SESSION_TOKEN` to its `RELAY_TOKEN` in the root `.env.local`.
This is for development and testing only, not production authentication.

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

## End-to-end suite

The Playwright flows under `tests/ui` and how to run them locally are described
in [tests/ui/README.md](tests/ui/README.md). They run on every pull request as
the `ui-tests` check.

### Against the live API through a local relay

`tests/live` drives every screen against the real January API, with client
tokens from the token relay, and after each change made in the demo reads the
same data back from the API to confirm it. With the relay running (`./start.sh`
in `january-token-relay`), from `examples/react-demo`:

```sh
LIVE_END_USER_ID=your-test-user npm run test:ui:live
```

Use a dedicated test user: the run creates meals and water logs for it and
deletes them at the end, and it logs two weights for today, which the API does
not delete. It uses the relay at `http://127.0.0.1:8787` unless
`PARTNER_TOKEN_URL` says otherwise (with `PARTNER_APP_SESSION_TOKEN` for a hosted
relay). The API allows 60 requests a minute per end user, so each flow waits
until a minute after the previous flow's last request, and the run takes about
20 minutes.

A complete run makes about 225 API requests between the demo and the checks,
about 165 of them in the `@logs` half. Your account's allowance also caps
requests in any rolling 24 hours; if that cap is smaller, run the two halves on
different days:

```sh
LIVE_END_USER_ID=your-test-user npm run test:ui:live -- --grep @catalog   # search, scans, restaurants, glucose
LIVE_END_USER_ID=your-test-user npm run test:ui:live -- --grep @logs      # meals, water, weight, charts
```

The `@portion` flow, part of `@logs`, also runs on its own in about 8 requests. It
logs greek yogurt's default 6 oz portion from the food's detail and checks that
Logs and the API both record one serving (about 100 kcal, not 600), then deletes
the log. Give it its own test user and evidence folder:

```sh
LIVE_END_USER_ID=e2e-qa-portion-web LIVE_EVIDENCE_DIR=test-results/live-portion npm run test:ui:live -- --grep @portion
```

When the allowance runs out mid-run, the remaining flows are skipped with the
API's message rather than retried.

Everything lands in `LIVE_EVIDENCE_DIR` (default `test-results/live`): a
screenshot per step, a Playwright trace per flow, `api-verification.log` with
every direct API call (method, path, status, and body, with tokens redacted),
and `steps.jsonl` with what each step compared. If a run stops early, delete
what it created with `node tests/live/live-api.mjs cleanup`; `node
tests/live/live-api.mjs state` prints the test user's logs for today. The live
suite is not part of `npm run test:ui` or CI.
