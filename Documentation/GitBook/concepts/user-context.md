# User identity and timezone

Use an opaque, stable application account ID. The partner backend binds the
client token to that user. The SDK does not persist identity.

Create one scoped client after authentication and reuse it across Foods,
Restaurants, Food Analysis, Food Logs, Water Logs, Weight Logs, and Glucose:

```ts
const user = january.forUser({
  endUserId: authenticatedAccount.stableId,
  endUserTimezone: 'America/New_York',
});

const foods = await user.foods.search({ query: 'banana' });
```

`endUserTimezone` is an optional IANA identifier. It sets the calendar days for
food, water, and weight log lists and food-log summaries, and is sent with
glucose predictions; without it the SDK uses UTC. Create a new scoped client
after sign-in, sign-out, account switching, or timezone changes.

Request types retain optional identity fields for source compatibility. New
integrations should use the scoped client instead of repeating `endUserId` in
individual calls.

In client-token mode, the transport removes `January-End-User-ID`; do not add it
back (for example in a custom `fetch`). A header naming a different user than
the token fails with `403 end_user_id_mismatch` (category `authorization`).
