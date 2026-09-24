# Food, Water, and Weight Logs and Glucose API

Prefer `january.forUser(...)` so identity and timezone are applied consistently
across all SDK resources, including the Food Logs, Water Logs, Weight Logs, and
Glucose operations here.
All scoped request objects accept optional `signal`.

## Scoped Food Logs

```ts
create(request: {
  foods: FoodSelection[];
  timestampUtc?: string;
  name?: string;
  signal?: AbortSignal;
}): Promise<FoodLog>

list(request: {
  start: string;
  end: string;
  signal?: AbortSignal;
}): Promise<ListFoodLogsResponse>

getSummary(request: {
  start: string;
  end: string;
  groupBy?: 'day' | 'week';
  weekStart?: 'monday' | 'sunday';
  signal?: AbortSignal;
}): Promise<FoodLogSummary>

// At least one of foods, timestampUtc, or name is required.
update(request: {
  logId: string;
  foods?: FoodSelection[];
  timestampUtc?: string;
  name?: string;
  signal?: AbortSignal;
}): Promise<FoodLog>

delete(request: {
  logId: string;
  signal?: AbortSignal;
}): Promise<DeleteFoodLogResponse>
```

Timestamps must be ISO-8601 date-times. `start` and `end` must be ISO dates
(`YYYY-MM-DD`) and are inclusive calendar boundaries in the scoped timezone (UTC
when none is set). They must be real calendar dates: an impossible date such as
`2026-02-31` throws a `TypeError` instead of rolling into the next month. Food-log
`list` spans at most 60 days.
`FoodLog` contains `id`, `foods`, `timestampUtc`, and optional `name`; list
returns `totalCount` and items; delete returns nothing and succeeds for an
unknown or already-deleted log.

`getSummary` aggregates the logs in the inclusive range (at most 366 days) into
`buckets`, one per local calendar day or per week, each with `logsCount`,
`daysWithLogs`, and summed `nutrients`. Empty periods are still returned with
zero counts. `totals` covers the whole range and `averagePerLoggedDay` divides
the totals by the number of days that have a log. `nutrients` is sparse: read
`logsCount` to tell an empty bucket from one whose logs had no nutrition data.
`weekStart` is `null` when grouping by day.

The unscoped `january.foodLogs` methods use the same signatures plus required
`endUserId: string` and optional `endUserTimezone: string`. `update` sends only
the fields you set and throws a `TypeError` when none is set.

## Scoped Water Logs

```ts
create(request: {
  amount: { value: number; unit: VolumeUnit };
  consumedAt?: string;
  signal?: AbortSignal;
}): Promise<WaterLog>

list(request: {
  start: string;
  end: string;
  unit: VolumeUnit;
  signal?: AbortSignal;
}): Promise<ListWaterLogsResponse>

delete(request: {
  logId: string;
  signal?: AbortSignal;
}): Promise<DeleteWaterLogResponse>
```

`WaterLog` has `id`, `amount` (`{ value, unit }` as logged), and `consumedAt` in
UTC. `ListWaterLogsResponse.items` holds one `{ date, total }` per local day
with water logged, oldest first, in the requested `unit`; `total.value` is
rounded to one decimal place. At most 100 days are returned, the most recent
100 when more match. `delete` returns nothing and succeeds for an unknown log.

## Scoped Weight Logs

```ts
create(request: {
  weight: { value: number; unit: WeightUnit };
  measuredAt?: string;
  signal?: AbortSignal;
}): Promise<WeightLog>

list(request: {
  start: string;
  end: string;
  signal?: AbortSignal;
}): Promise<ListWeightLogsResponse>
```

`WeightLog` has `weight` (`{ value, unit }` as logged) and `measuredAt` in UTC.
`ListWeightLogsResponse.items` holds one `{ date, weight }` per local day that
has a measurement, the latest of that day, oldest first. At most 100 days are
returned, the most recent 100 when more match.

Water and weight `start` and `end` follow the same date rules as food logs,
without the 60-day span limit; instead, `start` may be at most five years ago. The unscoped `january.waterLogs` and
`january.weightLogs` methods add required `endUserId: string` and optional
`endUserTimezone: string`. Units are closed on input (`VolumeUnit`,
`WeightUnit`) and passed through as strings in responses.

## Glucose

```ts
predict(request: PredictGlucoseRequest): Promise<GlucosePrediction>
```

`PredictGlucoseRequest` fields:

| Field | Type and default |
| --- | --- |
| `userProfile` | `GlucosePredictionProfile`, required |
| `foods` | `FoodSelection[]`, required |
| `startTime` | `Date`, required |
| `cgmData` | `CgmReading[]?` |
| `consumedFoods` | `ConsumedHistoricalFood[]?` |
| `endUserId` | `string?` |
| `endUserTimezone` | `string?` |
| `signal` | `AbortSignal?` |

The scoped `user.glucose.predict` omits identity/timezone fields and applies its
context. CGM and historical-food timestamps are ISO strings. The response has
prediction points, an impact string, and chart min/max.
