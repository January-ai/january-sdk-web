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
to 29 (water logs, weight logs, their recovery states, and the Tracking charts)
were added on the web first; the native suites pick up the same numbers when
they gain the feature. That makes 27 numbered specs plus 20 role-based ones, 48
in all.

## Tracking and Logs

Two tabs cover logs. **Tracking** (`/tracking`, tab `tab-tracking`, screen
`tracking-screen`) shows one day at a time and loads the day's meals, totals,
water, and weight as soon as a user is set; every query is keyed by the day, so
a flow that needs a fresh request moves to another day. **Logs** (`/food-logs`,
tab `tab-food-logs`, screen `food-logs-screen`) is the meal-history list with
the Today / This week / Last month presets and add, edit, and delete.

Tracking test ids:

- Day: `logs-day-previous`, `logs-day-next`, `logs-day-today`, `logs-day-input`,
  `logs-day-label` (`Today`, `Yesterday`, or the spelled-out date),
  `logs-day-refresh` (reload every query for the day).
- Meals: `food-day-totals` (from `foodLogs.getSummary`, `food-day-totals-error`),
  `tracking-meal-add`, `tracking-meal-list`, `tracking-meal-N`,
  `tracking-meal-open` (opens the meal editor), `tracking-meal-delete`,
  `tracking-meals-loading`, `tracking-meals-empty`, `tracking-meals-error`,
  `tracking-meal-delete-error`, `tracking-prompt` (no user yet).
- Water: `water-day-total` or `water-logs-empty` / `water-logs-loading` /
  `water-logs-error`, `water-unit-fl-oz`, `water-unit-ml`, `water-amount`,
  `water-log-add`, `water-log-add-error`, `water-log-last`, `water-log-delete`,
  `water-log-delete-error`.
- Weight: `weight-day-value` or `weight-logs-empty` / `weight-logs-loading` /
  `weight-logs-error`, `weight-unit-lb`, `weight-unit-kg`, `weight-value`,
  `weight-log-add`, `weight-log-add-error`, `weight-log-last`.
- Charts (ranges end today, whatever day is picked): `weight-chart` and
  `water-chart` carry `data-range` (`week`, `month`, `year`), `data-unit` and
  `data-count` (days, or months for Year, with a log); `water-chart` also has
  `data-slots` (7, 30 or 12 bars). Range buttons are
  `weight-chart-range-week|month|year` and `water-chart-range-week|month|year`
  with `aria-pressed`. States: `weight-chart-empty`, `water-chart-empty`,
  `*-chart-loading`, `*-chart-error` with `*-chart-retry`. Summaries:
  `weight-chart-latest`, `water-chart-total`.

For a range (start date before end date) the fixture answers the list routes
with a generated year of history ending today, with gaps, and weights older
than 45 days stored in kg; a single-day request keeps its fixed answer.

Logs keeps its original ids: `logs-range-today`, `logs-range-week`,
`logs-range-month`, `food-logs-refresh`, `food-log-list`, `food-log-N`,
`food-log-add`, `food-log-edit`, `food-log-delete`, `food-logs-loading`,
`food-logs-empty`, `food-logs-error`, `food-log-delete-error`,
`food-logs-prompt`. Both screens share the editor's `food-log-*` and
`food-picker-*` ids.

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
