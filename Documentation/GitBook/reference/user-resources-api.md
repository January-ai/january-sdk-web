# Food Logs and Glucose API

Prefer `january.forUser(...)` so identity and timezone are applied consistently
across all SDK resources, including the Food Logs and Glucose operations here.
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
(`YYYY-MM-DD`) and are inclusive calendar boundaries in the scoped timezone.
`FoodLog` contains `id`, `foods`, `timestampUtc`, and optional `name`; list
returns `totalCount` and items; delete returns `status`.

`getSummary` aggregates the logs in the inclusive range (at most 366 days) into
`buckets`, one per local calendar day or per week, each with `logsCount`,
`daysWithLogs`, and summed `nutrients`. Empty periods are still returned with
zero counts. `totals` covers the whole range and `averagePerLoggedDay` divides
the totals by the number of days that have a log. `nutrients` is sparse: read
`logsCount` to tell an empty bucket from one whose logs had no nutrition data.
`weekStart` is `null` when grouping by day.

The unscoped `january.foodLogs` methods use the same signatures plus required
`endUserId: string` and optional `endUserTimezone: string`.

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
