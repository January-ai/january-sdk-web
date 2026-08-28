# Troubleshooting

## npm returns 404

Confirm the package is installed from npm and follow the [installation guide](../getting-started/installation.md).

## A GitHub dependency installs but cannot import `dist/index.js`

Direct Git installation is not supported in the current preview because `dist`
is generated and no `prepare` script builds it. Use `npm run build`, `npm pack`,
and install the resulting tarball.

## Browser bundle contains server-side credentials

Remove them immediately, rotate the exposed credentials, and keep token issuance
inside the authenticated application backend. Browsers use `clientTokenProvider`
against that endpoint.

## Browser request fails during CORS preflight

The production Partner API does not accept arbitrary browser origins. Confirm
with January that the exact scheme, host, and port for the application are
enabled. Do not work around this with `mode: 'no-cors'`, and never proxy a
server-side credential into browser code. Until the origin is enabled, run the SDK in a
trusted Node.js application route and call that route from the browser.

## Token provider fails

Check the explicit endpoint URL, application session, CORS/credentials policy,
TLS, HTTP status, and response. It needs a non-empty token plus `expiresIn` or
`expires_in` greater than 60 seconds. There is no SDK endpoint default.

## Provider is called repeatedly

Reuse one `JanuaryClient`. Check whether the returned token is within the
60-second refresh window or January responds with `401 token_expired`. Concurrent
refresh normally shares one provider call.

## Food picker has incomplete servings

After selecting a search result, call `foods.get`. Autocomplete and search
objects are discovery data and are not guaranteed complete.

## `preparePhotoScanImage` fails in Node.js or SSR

It requires browser DOM/canvas APIs. Call it only in browser code, or prepare a
data URI with server-side image tooling.

## Cancellation appears as an error

Treat an error whose name is `AbortError` as caller cancellation. The SDK does
not convert it to `JanuaryError` or retry it.

## Support diagnostics

Provide the pinned commit, runtime/framework version, operation,
`JanuaryError.category`, status, code, request ID, and minimal reproduction.
Exclude credentials, images, nutrition records, and health profiles.
