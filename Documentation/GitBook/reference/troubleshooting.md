# Troubleshooting

## Browser request fails during CORS preflight

The request rejects with a `JanuaryError` whose category is `transport` and whose message is "The request failed and the interceptors did not return an alternative response"; the browser console shows a CORS error. January hasn't enabled the page's origin. Ask your January contact to enable the exact scheme, host, and port, and until then make January calls from your server ([Runtime and security boundaries](../concepts/runtime-boundaries.md)). Don't work around it with `mode: 'no-cors'` or by moving the API key into the browser.

## The API key is in the browser bundle

Remove it, rotate the key in the Developer Dashboard, and mint client tokens on your server instead ([Backend token endpoint](../getting-started/backend-token-endpoint.md)).

## Token provider fails

Check the endpoint URL, the app session, CORS on the token endpoint, and the HTTP status and body it returns. The body needs a nonblank `token` and an `expires_in` (or `expiresIn`) over 60 seconds. With the token relay, a browser page also needs its origin in the relay's `ALLOWED_ORIGINS` ([Authentication](../getting-started/authentication.md#develop-with-the-token-relay)). How each failure surfaces is in [When the provider fails](../getting-started/authentication.md#when-the-provider-fails).

## Provider is called repeatedly

Reuse one `JanuaryClient` per signed-in user. A new client starts with an empty token cache. Also check whether the token's lifetime is close to the 60-second refresh window, or whether January answers `401 token_expired`.

## Data from the previous user appears

The client still holds the previous user's token. Create a new `JanuaryClient` on sign-in, sign-out, and account switches ([Client lifecycle](../concepts/client-lifecycle.md)).

## Food picker has incomplete servings

After the user picks a search result, call `foods.get`. Autocomplete and search results are summaries.

## `preparePhotoScanImage` fails in Node.js or SSR

It needs browser image and canvas APIs, so call it only in the browser. On a server, pass `analyzePhoto` a publicly fetchable image URL or a data URI you prepare there.

## Canceled requests look like errors

A canceled request rejects with an `AbortError`, not a `JanuaryError`. Check the error's `name` or your signal's `aborted` flag before treating it as a failure ([Error handling](error-handling.md#cancellation)).

## Contacting support

See [what to include](testing-and-support.md#contact-support).
