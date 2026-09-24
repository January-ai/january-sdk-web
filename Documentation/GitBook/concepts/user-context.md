# User identity and timezone

`forUser` binds an end-user ID and a timezone to every call made through the scoped client:

```ts
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const user = january.forUser({ endUserId: session.endUserId, endUserTimezone: timeZone });

// YYYY-MM-DD for a moment, in the client's timezone.
function localDate(date: Date, timeZone: string): string {
  const { year, month, day } = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
  return `${year}-${month}-${day}`;
}

const today = localDate(new Date(), timeZone);
const { items } = await user.foodLogs.list({ start: today, end: today });
```

## End-user ID

Use your own opaque, stable ID for the person, never an email address or name. With a client token, the token decides which user January acts for, and the SDK doesn't send `endUserId` to January: it removes the `January-End-User-ID` header from every call. Don't add that header back, for example in a custom `fetch`; if it names a different user than the token, the call fails with `403 end_user_id_mismatch` (category `authorization`).

The SDK doesn't store the ID. A different signed-in user needs a new `JanuaryClient`, not only a new scoped client; see [Client lifecycle](client-lifecycle.md).

## Timezone

`endUserTimezone` is an IANA name such as `America/New_York`. Without it the SDK uses UTC. It sets the calendar days for food-log lists and summaries and for water and weight lists, and it is sent with glucose predictions. Pass the device timezone as above, or the timezone from the user's profile if their days shouldn't shift when they travel. Create a new scoped client when it changes.

## Days and times

* **Instants** (`timestampUtc`, `consumedAt`, `measuredAt`) accept any ISO 8601 offset. The SDK sends them to January in UTC.
* **Ranges** (`start`, `end`) are inclusive `YYYY-MM-DD` dates in the client's timezone. Build them in that same timezone, as `localDate` does; `toISOString().slice(0, 10)` gives the UTC date instead.
* **Days are assigned when you read**, in the client's timezone. A client without one uses UTC, so a late-evening meal in Los Angeles lists under the next day.

The API's rules for days, with an example and the water cap's day, are in [Days and timezones](https://docs.january.ai/rest-api/api-overview#days-and-timezones).
