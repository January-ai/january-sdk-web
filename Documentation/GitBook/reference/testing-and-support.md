# Testing and support

## Test your integration

Before launch, check that:

* Your provider handles a token response with `expires_in` and one with `expiresIn`.
* A failing token endpoint surfaces the right error, and retries stop in a time your UI can live with ([retry policy](retries-and-lifecycle.md#provider-retry-policy)).
* Concurrent requests share one token fetch, and a `401 token_expired` is replayed once.
* A canceled request is treated as cancellation, not as a failure.
* Autocomplete leads to search, and a picked result loads the full food with `foods.get` before servings show.
* Photo preparation works in each browser you support.
* Signing out, switching accounts, and changing the timezone each give the right user's data ([Client lifecycle](../concepts/client-lifecycle.md)).
* Your production bundle and network panel contain no API key.

Before upgrading, read the [changelog](changelog.md).

## Contact support

Include the SDK version, browser and framework versions, the operation, the `JanuaryError` category, status, code, and request ID, and a minimal reproduction. Leave out API keys, tokens, images, nutrition records, and health profiles.
