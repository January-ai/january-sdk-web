# Error handling and cancellation

```ts
try {
  await january.foods.search({ query: 'banana' });
} catch (error) {
  if (error instanceof JanuaryError) {
    console.error(error.category, error.status, error.code, error.requestId);
  } else if (error instanceof DOMException && error.name === 'AbortError') {
    // The caller canceled the operation.
  }
}
```

`JanuaryError.category` is one of `authentication`, `authorization`,
`validation`, `notFound`, `rateLimit`, `server`, `transport`, or `unknown`.
`code` is the API's stable identifier; among the `validation` codes,
`daily_water_limit_exceeded` means a water log would take its day past 24
liters and `date_range_too_large` means a list range starts more than five
years ago.
The SDK handles `token_expired` internally and replays once; do not add an
unbounded request-retry loop. Never log tokens, meal images, nutrition data, or
health profiles.
