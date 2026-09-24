# Water and weight logs

Scope: `water_logs:read` and `weight_logs:read` to list; `water_logs:write` to create and delete water, and `weight_logs:write` to create weight. `user` is the [scoped client](../concepts/client-lifecycle.md).

## Water

```ts
import { VolumeUnit } from '@januaryai/web-sdk';

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

* **Amounts.** Log one amount at a time: 1–811.5 fluid ounces, 30–24,000 milliliters, or 0.1–101.4 US cups of 8 fl oz. `consumedAt` is any ISO 8601 date-time and defaults to now. Keep the returned `id` to delete the entry.
* **Daily cap.** An end user can log up to 24 L a day. The cap counts the UTC calendar day of `consumedAt`, whatever offset you send. A log past it fails with category `validation` and code `daily_water_limit_exceeded`; don't retry it. Because `list` groups days in the client's timezone, near midnight a listed day's total can differ from what the cap counted.
* **Lists** return one total per day that has water, oldest first, in the unit you ask for. Days with nothing logged are left out, and at most 100 days come back (the most recent 100 when more match).
* **Deletes** succeed for an unknown or already-deleted log, so they're safe to retry.

## Weight

```ts
import { WeightUnit } from '@januaryai/web-sdk';

await user.weightLogs.create({
  weight: { value: 150, unit: WeightUnit.pounds },
  measuredAt: '2026-09-10T07:30:00-07:00',
});

const weights = await user.weightLogs.list({ start: '2026-09-01', end: '2026-09-30' });
weights.items.forEach((day) => console.log(day.date, day.weight.value, day.weight.unit));
```

Log a measurement in pounds (10–1,000) or kilograms (4.5–453.6). Every measurement is kept; `list` shows the latest one per day, in the unit it was logged in, and returns at most 100 days (the most recent 100 when more match). Weight logs have no ID and can't be updated or deleted; to change what a day shows, log a later measurement for that day.

## Both

* **Creating isn't idempotent.** After a create that timed out, list the day before you retry, or you may record the amount twice.
* **Days.** `start` and `end` are inclusive dates in the client's timezone ([User identity and timezone](../concepts/user-context.md#days-and-times)). `start` can be at most five years back; an older one fails with code `date_range_too_large`.
* **Invalid input** such as an impossible date (`2026-02-31`) or an unknown unit is rejected before any request is sent, as a `JanuaryError` with category `transport` whose `cause` is a `TypeError` ([Error handling](../reference/error-handling.md#invalid-input)).
