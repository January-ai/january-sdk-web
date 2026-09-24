# Logs and glucose API

The signatures below are for a scoped client, `user.foodLogs`, `user.waterLogs`,
`user.weightLogs`, and `user.glucose`, which applies the end-user ID and timezone
([Client and authentication API](client-and-resources.md#scoped-clients)).

## Food logs

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

get(request: {
  logId: string;
  signal?: AbortSignal;
}): Promise<FoodLog>

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

Timestamps are ISO 8601 date-times with any offset. `start` and `end` are
inclusive `YYYY-MM-DD` dates in the scoped timezone (UTC when none is set) and
must be real calendar dates ([invalid input](error-handling.md#invalid-input)).
Food-log `list` spans at most 60 days.
`FoodLog` contains a nullable `id`, `foods`, `timestampUtc`, and optional
`name`. `list` returns `totalCount` and `items`; `totalCount` is the number of
items returned, not a separate total. `get` returns one `FoodLog`. `delete`
returns nothing and succeeds for an unknown or already-deleted log
(`DeleteFoodLogResponse` is an alias for `void`).

`getSummary` aggregates the logs in the inclusive range (at most 366 days) into
`buckets`, one per local calendar day or per week, each with `logsCount`,
`daysWithLogs`, and summed `nutrients`. Empty periods are still returned with
zero counts. `totals` covers the whole range and `averagePerLoggedDay` divides
the totals by the number of days that have a log. `nutrients` is sparse: read
`logsCount` to tell an empty bucket from one whose logs had no nutrition data.
`weekStart` is `null` when grouping by day.

`update` sends only the fields you set and throws a `TypeError` when none is
set. `create` is not idempotent.

## Water logs

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

`amount.value` must be 1–811.5 `fl_oz`, 30–24,000 `ml`, or 0.1–101.4 `cup`. An
end user's total is capped at 24 L (about 811 fl oz) per UTC calendar day of
`consumedAt` (`daily_water_limit_exceeded` otherwise); see
[Water and weight logs](../guides/water-and-weight-logs.md#water). `create` is
not idempotent. `WaterLog` has a UUID string `id`, `amount` (`{ value, unit }` as
logged), and `consumedAt` in UTC. `ListWaterLogsResponse.items` holds one
`{ date, total }` per local day with water logged, oldest first, in the
requested `unit`; `total.value` is rounded to one decimal place. At most 100
days are returned, the most recent 100 when more match. `delete` returns nothing
and succeeds for an unknown log.

## Weight logs

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

`weight.value` must be 10–1,000 `lb` or 4.5–453.6 `kg`. `WeightLog` has
`weight` (`{ value, unit }` as logged) and `measuredAt` in UTC; weight logs have
no ID and cannot be updated or deleted. `create` is not idempotent.
`ListWeightLogsResponse.items` holds one `{ date, weight }` per local day that
has a measurement, the latest of that day, oldest first. At most 100 days are
returned, the most recent 100 when more match.

Water and weight `start` and `end` follow the same date rules as food logs,
without the 60-day span limit; instead, `start` may be at most five years ago.
Units are closed on input (`VolumeUnit`, `WeightUnit`) and passed through as
strings in responses.

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

The scoped `user.glucose.predict` omits `endUserId` and `endUserTimezone` and
sends its timezone (UTC when none is set). CGM and consumed-food timestamps are
ISO 8601 strings. The response has `prediction` points, an `impact` grade, and
`chart` bounds; see [Glucose prediction](../guides/glucose-prediction.md).
