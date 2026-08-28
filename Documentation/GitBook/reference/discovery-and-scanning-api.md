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
```

`SearchRestaurantsRequest` fields:

| Field | Type, default, and validation |
| --- | --- |
| `query` | `string`, required, trimmed, 1–256 characters |
| `latitude` | `number`, required, −90…90 |
| `longitude` | `number`, required, −180…180 |
| `radius` | `number?`; server default when omitted, otherwise 1…17,000 |
| `limit` | `number?`; server default when omitted, otherwise integer 1…100 |

`SearchRestaurantsResponse` contains `totalCount` and `Restaurant[]`. Restaurant
fields are type/ID/name and optional chain, distance, city, and address metadata.
Menu search returns `RestaurantMenuItem[]` with restaurant name, optional
nutrition/distance/photo values, and servings.

## Food analysis

```ts
analyzePhoto(request: ScanFoodPhotoRequest): Promise<FoodScan>
analyzeDescription(
  request: SearchFoodsByNaturalLanguageRequest,
): Promise<FoodScan>
correct(request: CorrectPhotoScanRequest): Promise<FoodScan>
```

`ScanFoodPhotoRequest.image` is a required nonblank base64 data URI.
`CorrectPhotoScanRequest` requires `mealName`, current `detections`, and
`userInput`.

`FoodScan` contains optional `mealName`, `totalNutrients`, `detections`, and
`glucoseImpact`. Each detection contains a detected food and optional confidence
score.

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
