# Restaurants and food analysis API

Use these through a scoped client, `user.restaurants` and `user.foodAnalysis` ([Client and resources](client-and-resources.md#scoped-clients)). Every request accepts an optional `signal: AbortSignal`.

## Restaurants

```ts
search(request: SearchRestaurantsRequest): Promise<SearchRestaurantsResponse>
searchMenuItems(
  request: SearchRestaurantsRequest,
): Promise<SearchRestaurantMenuItemsResponse>
getMenuItems(
  request: GetRestaurantMenuItemsRequest,
): Promise<GetRestaurantMenuItemsResponse>
```

`SearchRestaurantsRequest` fields:

| Field | Type, default, and validation |
| --- | --- |
| `query` | `string`, required, trimmed, 1–256 characters |
| `latitude` | `number`, required, −90–90 |
| `longitude` | `number`, required, −180–180 |
| `radius` | `number?`, in meters; 8,000 when omitted, otherwise 1–50,000 |
| `limit` | `number?`; 10 when omitted, otherwise integer 1–100 |

`SearchRestaurantsResponse` contains `totalCount` and `Restaurant[]`. Restaurant
fields are `type`, `id`, `name`, and optional `isChain`, `distance`, `city`,
`address1`, and `address2`. Menu search returns `RestaurantMenuItem[]` with the
restaurant name, optional nutrition, distance, and photo values, and servings.
In both, `totalCount` is the number of items in this response, not the total
number of matches.

`GetRestaurantMenuItemsRequest` accepts `restaurantId`, optional `limit`
(default 100, integer 1–100), and optional `offset` (default 0).
`GetRestaurantMenuItemsResponse` contains only `items: RestaurantMenuEntry[]`,
with no `totalCount`. For paging and unknown restaurants, see
[Restaurants](../guides/restaurants.md#load-one-restaurants-menu).

Invalid queries, coordinates, radius, limits, or IDs throw `TypeError` before any
request.

## Food analysis

```ts
analyzePhoto(request: ScanFoodPhotoRequest): Promise<FoodScan>
analyzeDescription(
  request: SearchFoodsByNaturalLanguageRequest,
): Promise<FoodScan>
correct(request: CorrectPhotoScanRequest): Promise<FoodScan>
```

`ScanFoodPhotoRequest.image` is a required nonblank base64 data URI or publicly
fetchable `http(s)` URL; an unreachable URL fails with `image_unreachable`. The
API uses the reasoning-based analyzer unless `reasoningEffort: 'none'` asks for
the standard one; the SDK sends the effort only when you set it. The result
shape and cost are the same either way. `CorrectPhotoScanRequest` takes the
prior `analysis` and an `instruction`.

`FoodScan` contains `mealName` (possibly `null`), `totalNutrients`, and
`detections`, which is empty when nothing was recognized. Food analysis does not
return a glucose impact; use `glucose.predict` for that. Each detection contains
a `DetectedFood` and an optional confidence score.
`DetectedFood` has `id`, `name`, `brandName`, `nutrients`, `serving`, and
`quantity`: `serving` is the selected catalog serving (`ServingSummary` with
`id`, `quantity`, `unit`, where `quantity` is the size of one serving) and
`quantity` is how many of that serving were eaten, so
`{ id: food.id, serving: { id: food.serving.id, quantity: food.quantity } }`
logs the detection as is. `nutrients` are already scaled to `quantity`.

Food alternatives (`foods.suggestAlternatives`) return `AlternativeFood` values
with `servings: ServingSummary[]` to read the nutrition against.

## Browser image helper

```ts
preparePhotoScanImage(
  image: Blob,
  options: { maxDimension?: number; jpegQuality?: number } = {},
  adapter?: PhotoScanImageAdapter,
): Promise<PreparedPhotoScanImage>
```

Defaults are maximum dimension 1,000 and JPEG quality 0.7. The result contains
`dataUri`, `width`, `height`, and `mimeType: 'image/jpeg'`. The default adapter
requires browser image/canvas APIs. Invalid file type/dimensions/options throw
`TypeError` or `RangeError`.
