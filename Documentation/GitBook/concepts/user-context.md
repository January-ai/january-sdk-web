# User identity and timezone

Use an opaque, stable application account ID. The partner backend binds the
client token to that user. The SDK does not persist identity.

For Food Logs and Glucose, create a scoped client:

```ts
const user = january.forUser({
  endUserId: authenticatedAccount.stableId,
  endUserTimezone: 'America/New_York',
});
```

`endUserTimezone` is an optional IANA identifier. It controls Food Log calendar
boundaries and accompanies Glucose context. Create a new scoped client after
sign-in, sign-out, account switching, or timezone changes.

In client-token mode, the transport removes `x-end-user-id`; do not add it back
manually. A mismatch between the token-bound user and a manually asserted ID is
an authentication error by design.
