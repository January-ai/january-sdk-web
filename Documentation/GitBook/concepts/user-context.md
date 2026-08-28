# User identity and timezone

Use an opaque, stable application account ID. The partner backend binds the
client token to that user. The SDK does not persist identity.

Create one scoped client after authentication and reuse it across Foods,
Restaurants, Photo Scanning, Food Logs, and Glucose:

```ts
const user = january.forUser({
  endUserId: authenticatedAccount.stableId,
  endUserTimezone: 'America/New_York',
});

const foods = await user.foods.search({ query: 'banana' });
```

`endUserTimezone` is an optional IANA identifier. It controls Food Log calendar
boundaries and accompanies Glucose context. Create a new scoped client after
sign-in, sign-out, account switching, or timezone changes.

Request types retain optional identity fields for source compatibility. New
integrations should use the scoped client instead of repeating `endUserId` in
individual calls.

In client-token mode, the transport removes `x-end-user-id`; do not add it back
manually. A mismatch between the token-bound user and a manually asserted ID is
an authentication error by design.
