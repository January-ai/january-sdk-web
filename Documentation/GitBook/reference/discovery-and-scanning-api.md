# Restaurants and food analysis API

All request types accept optional `endUserId` and `signal`.

Prefer `january.forUser(...).restaurants` and
`january.forUser(...).foodAnalysis`; their request types omit `endUserId` and
reuse the configured identity automatically.

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
| `latitude` | `number`, required, −90…90 |
| `longitude` | `number`, required, −180…180 |
| `radius` | `number?`, in meters; 8,000 when omitted, otherwise 1…50,000 |
| `limit` | `number?`; server default when omitted, otherwise integer 1…100 |

`SearchRestaurantsResponse` contains `totalCount` and `Restaurant[]`. Restaurant
fields are type/ID/name and optional chain, distance, city, and address metadata.
Menu search returns `RestaurantMenuItem[]` with restaurant name, optional
nutrition/distance/photo values, and servings.

`GetRestaurantMenuItemsRequest` accepts `restaurantId`, optional `limit`
(default `100`, integer 1–100), optional `offset` (default `0`), optional
`endUserId`, and optional `signal`. `GetRestaurantMenuItemsResponse` contains
only `items: RestaurantMenuEntry[]`, with no `totalCount`: advance the offset by
the returned item count while a full page comes back. An empty page ends the
menu, including for a restaurant with no menu on record. Unknown restaurants
return `404`.

## Food analysis

```ts
analyzePhoto(request: ScanFoodPhotoRequest): Promise<FoodScan>
analyzeDescription(
  request: SearchFoodsByNaturalLanguageRequest,
): Promise<FoodScan>
correct(request: CorrectPhotoScanRequest): Promise<FoodScan>
```

`ScanFoodPhotoRequest.image` is a required nonblank base64 data URI. The API
uses the reasoning-based analyzer unless `reasoningEffort: 'none'` asks for the
standard one; the SDK sends the effort only when you set it. The result shape and
cost are the same either way. `CorrectPhotoScanRequest` takes the prior
`analysis` and an `instruction`.

`FoodScan` contains `mealName`, `totalNutrients`, and `detections`. Each
detection contains a `DetectedFood` and an optional confidence score.
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
