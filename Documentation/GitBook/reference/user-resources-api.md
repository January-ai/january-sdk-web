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
