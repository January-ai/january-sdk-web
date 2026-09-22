# Water and weight logs

Water and weight logs use the same app-owned identity and IANA timezone as food
logs, so create the scoped client once and reuse it:

```ts
import { VolumeUnit, WeightUnit } from '@januaryai/web-sdk';

const user = january.forUser({
  endUserId: authenticatedAccount.id,
  endUserTimezone: authenticatedAccount.timezone,
});
```

## Water

Log one amount at a time in fluid ounces or milliliters. `consumedAt` is any
ISO-8601 date-time and defaults to now; its local day is the one the daily cap
of 24 liters counts it against. Keep the returned `id` to delete the entry.

```ts
const glass = await user.waterLogs.create({
  amount: { value: 8, unit: VolumeUnit.fluidOunces },
});

const totals = await user.waterLogs.list({
  start: '2026-09-01',
  end: '2026-09-30',
  unit: VolumeUnit.milliliters,
});
totals.items.forEach((day) => console.log(day.date, day.total.value, day.total.unit));

await user.waterLogs.delete({ logId: glass.id });
```

`list` returns one total per local calendar day that has water logged, oldest
first, converted to the unit you ask for. Days with nothing logged are absent,
and at most 100 days are returned. Deleting an unknown or already-deleted log
succeeds too, so a delete is safe to retry. A log that would take a day past the
cap is rejected with a `validation` error whose `code` is
`daily_water_limit_exceeded`.

## Weight

Log a measurement in pounds or kilograms. Every measurement is kept; `list`
shows the latest one per local day, in the unit it was logged in.

```ts
await user.weightLogs.create({
  weight: { value: 150, unit: WeightUnit.pounds },
  measuredAt: '2026-09-10T07:30:00-07:00',
});

const weights = await user.weightLogs.list({ start: '2026-09-01', end: '2026-09-30' });
weights.items.forEach((day) => console.log(day.date, day.weight.value, day.weight.unit));
```

Creating a water or weight log is not idempotent: a retried create records the
amount twice, so do not add your own retry loop around it. `start` and `end`
are inclusive calendar dates in the scoped timezone and `start` may be at most
five years ago; an older range fails with `code` `date_range_too_large`.
