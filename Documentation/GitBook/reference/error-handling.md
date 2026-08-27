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
The SDK handles `token_expired` internally and replays once; do not add an
unbounded request-retry loop. Never log tokens, meal images, nutrition data, or
health profiles.
