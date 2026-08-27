# Troubleshooting

## Browser bundle contains a partner key

Remove it immediately. Partner keys belong only in trusted server processes.
Use an authenticated token endpoint and `clientTokenProvider` in the browser.

## Token provider fails

Confirm the app explicitly configured its own endpoint and authentication. The
response needs a non-empty token and an `expiresIn` greater than 60 seconds.
There is intentionally no SDK default URL.

## Food picker has incomplete servings

Call `foods.getFood` after selection. Autocomplete and search return discovery
objects, not guaranteed complete serving collections.

## Photo scan is too large

Use `preparePhotoScanImage` before `photoScanning.scan`.

## Support diagnostics

Capture the operation, SDK version, runtime/browser version, category, status,
code, and request ID. Never include credentials or user health data.
