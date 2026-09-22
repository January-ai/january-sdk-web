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

## Coverage against the shared catalog

The numbered specs follow the React Native flow numbers. Two have no web
counterpart and are left out on purpose: 16 (food picker above the keyboard;
no soft keyboard on the web) and 24 (food alternatives; the web demo has no
alternatives feature). Scan correction, menu-item detail, health conditions and
the settings sheet also do not exist on the web, so those steps are omitted
from the flows that would otherwise include them. The older role-based specs
(`authentication`, `foods`, `restaurants`, `scan`, `food-logs`, `glucose`)
remain alongside for the relay and contract-shape checks they cover. Flows 26
to 28 (water logs, weight logs, and their recovery states) were added on the
web first; the native suites pick up the same numbers when they gain the
feature.

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
