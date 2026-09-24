# Food logs

Create a scoped client once so Food Logs and Glucose reuse the same app-owned
identity and IANA timezone:

```ts
const user = january.forUser({
  endUserId: authenticatedAccount.id,
  endUserTimezone: authenticatedAccount.timezone,
});

const log = await user.foodLogs.create({
  foods: [portion.selection],
  timestampUtc: new Date().toISOString(),
  name: 'Breakfast',
});

await user.foodLogs.list({ start: '2026-08-01', end: '2026-08-31' });
const summary = await user.foodLogs.getSummary({ start: '2026-08-01', end: '2026-08-31', groupBy: 'week' });
summary.buckets.forEach((week) => console.log(week.startDate, week.logsCount, week.nutrients.calories?.value));

// `id` is null only when January returns a log it can't address, which can't be updated or deleted.
if (log.id) {
  await user.foodLogs.update({ logId: log.id, name: 'Post-workout breakfast' });
  await user.foodLogs.delete({ logId: log.id });
}
```

List boundaries are inclusive calendar dates in the supplied timezone. A list
spans at most 60 days and a summary at most 366. The host application owns
identity persistence; the scoped client only applies it.
