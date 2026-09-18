# Demo end-to-end suite

Playwright specs that drive the React demo against the local fixture server,
one spec per user journey, mirroring the React Native, iOS and Android SDK
suites (same flow names, same kebab-case `data-testid`s). They run on every
pull request, split across three jobs, and locally in one command.

## Run locally

```sh
# From examples/react-demo. Playwright starts the fixture server (port 18767)
# and the dev server (port 3010) itself.
npx playwright test
npx playwright test tests/ui/09-glucose.spec.ts      # one flow
npx playwright test --shard=2/3                      # the slice CI runs as "2 of 3"
npx playwright test --ui                             # step through interactively
```

The dev server is started with `JANUARY_TEST_API_URL` pointing at the fixture
server, so the SDK talks to deterministic data and a stub token. Specs change
the server's behaviour through `control()` in `flow.ts` (HTTP status, empty
collections, a delay per route) and start from `resetFixture()` so no spec
inherits another's configuration.

## Conventions

- Select elements with `byId(page, 'search-input')` (`data-testid`), never by
  position; the ids are the React Native example's test IDs, shared by all four
  demos.
- Assert on transient loading states loosely; the fixture answers instantly
  unless a `delay` is configured.
- Keep specs independent: each one opens its route fresh.

## In CI

`.github/workflows/quality.yml` runs `ui-test-web` as three shards
(`--shard=N/3`). A failed test is retried once and marked flaky in the JUnit
report; each shard uploads `test-results` (report, traces and screenshots of
failures) as `playwright-web-N`. The `ui-tests` job summarizes the shards.
