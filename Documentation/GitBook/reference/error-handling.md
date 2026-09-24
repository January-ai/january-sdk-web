# Error handling

API and network failures reject with `JanuaryError`. Branch on `category`, and use `code` for detail:

```ts
import { JanuaryError } from '@januaryai/web-sdk';

const controller = new AbortController();
try {
  await user.foods.search({ query: 'banana', signal: controller.signal });
} catch (error) {
  if (controller.signal.aborted) {
    // Your code canceled the request; not a failure.
  } else if (error instanceof JanuaryError) {
    switch (error.category) {
      case 'validation': /* show error.message next to the input */ break;
      case 'notFound': /* fall back */ break;
      case 'rateLimit': /* back off */ break;
      case 'authentication':
      case 'authorization': /* check the session and the token's scopes */ break;
      default: /* show a generic error; log error.requestId */
    }
  } else {
    throw error;
  }
}
```

## Categories

| Category | HTTP status | Common `code` values | What to do |
| --- | --- | --- | --- |
| `validation` | 400, 422 | `invalid_request`, `date_range_too_large`, `daily_water_limit_exceeded`, `image_unreachable`, `image_corrupt`, `image_format_unsupported`, `image_invalid_base64` | Fix the input. Sending the same request again fails the same way. |
| `authentication` | 401, or none | `unauthorized`, `token_invalid`, `token_revoked`. With no status: the token provider ran out of retries or returned an unusable token. | Check your token endpoint and the app session. The SDK already handles `token_expired`. |
| `authorization` | 403 | `scope_insufficient`, `end_user_id_mismatch`, `forbidden` | Mint the token with the scopes the call needs ([scopes](../getting-started/backend-token-endpoint.md#what-the-web-sdk-needs)). |
| `notFound` | 404 | `not_found` | Fall back, for example to text search after a barcode miss. |
| `rateLimit` | 429 | `rate_limited`, `request_limit_exceeded`, `credit_limit_exceeded` | Back off on `rate_limited`. The other two last until your monthly allowance resets ([Credits](https://docs.january.ai/rest-api/credits)). |
| `server` | 500–599 | `internal_error`, `upstream_error`, `service_unavailable`, `upstream_timeout` | Retry reads with backoff. Before retrying a create, list the day to check it didn't go through. |
| `transport` | none | none | The request didn't complete or never started: a network failure, an origin January hasn't enabled, a canceled request, a failing token provider, or invalid log input. Check `cause`. |
| `unknown` | Any other, including 409 and 413 | `conflict`, `payload_too_large` | Show a generic error and log `requestId`. |

`status`, `code`, and `requestId` are set when January answered. All codes are listed in [REST errors](https://docs.january.ai/rest-api/api-overview#errors). Log `category`, `status`, `code`, and `requestId`; never log tokens, meal images, nutrition data, or health profiles.

## Invalid input

Most invalid requests throw a `TypeError` before anything is sent: food, restaurant, and food-analysis requests, `foodLogs.update` with no fields or a bad `timestampUtc`, and `forUser` with a blank end-user ID. `FoodPortion.from` throws `FoodPortionError`, and `preparePhotoScanImage` throws `TypeError` or `RangeError`.

In 0.3.0, invalid input to the other food-, water-, and weight-log calls and to glucose timestamps is also caught before anything is sent, but it rejects as a `JanuaryError` with category `transport` whose `cause` is the `TypeError`. Examples are an impossible date such as `2026-02-31`, an unknown unit, and a timestamp that isn't a date.

## Cancellation

In 0.3.0 an aborted request rejects with category `transport` and the message "The request failed and the interceptors did not return an alternative response", not with an `AbortError`. Check your signal's `aborted` flag first, as the sample does. An `AbortError` thrown by your token provider reaches the caller unchanged.
