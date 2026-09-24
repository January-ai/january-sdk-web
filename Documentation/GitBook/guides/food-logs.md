# Food logs

Scope: `food_logs:read` to list, get, and summarize; `food_logs:write` to create, update, and delete. `user` is the [scoped client](../concepts/client-lifecycle.md), and `portion` comes from [Food discovery and servings](../concepts/food-lifecycle.md).

```ts
const log = await user.foodLogs.create({
  foods: [portion.selection],
  timestampUtc: new Date().toISOString(),
  name: 'Breakfast',
});

const { items } = await user.foodLogs.list({ start: '2026-08-01', end: '2026-08-31' });
const summary = await user.foodLogs.getSummary({ start: '2026-08-01', end: '2026-08-31', groupBy: 'week' });
summary.buckets.forEach((week) => console.log(week.startDate, week.logsCount, week.nutrients.calories?.value));

// A log can come back with id: null; it can't be fetched, updated, or deleted.
if (log.id) {
  await user.foodLogs.update({ logId: log.id, name: 'Post-workout breakfast' });
  await user.foodLogs.delete({ logId: log.id });
}
```

* **Days.** `start` and `end` are inclusive dates in the client's timezone ([User identity and timezone](../concepts/user-context.md#days-and-times)). A list spans at most 60 days and a summary at most 366.
* **Creating isn't idempotent.** After a create that timed out, list the day before you retry, or you may log the meal twice.
* **Updates** send only the fields you set. **Deletes** resolve with no value, and deleting an unknown or already-deleted log succeeds.
