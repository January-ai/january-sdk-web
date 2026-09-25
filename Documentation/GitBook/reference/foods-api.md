# Foods API

Use these through a scoped client, `user.foods` ([Client and resources](client-and-resources.md#scoped-clients)). Every request accepts an optional `signal: AbortSignal`.

## Operations

```ts
autocomplete(request: AutocompleteFoodsRequest): Promise<AutocompleteFoodsResponse>
search(request: SearchFoodsRequest): Promise<FoodSearchResults>
get(request: GetFoodRequest): Promise<FoodSearchItem>
lookupBarcode(request: LookupFoodByBarcodeRequest): Promise<FoodSearchResults>
suggestAlternatives(
  request: SuggestFoodAlternativesRequest,
): Promise<SuggestFoodAlternativesResponse>
```

## Requests and defaults

| Request | Fields |
| --- | --- |
| `AutocompleteFoodsRequest` | `query: string`; `category?: AutocompleteFoodCategory`; `limit?: number` (default 8, range 1–20) |
| `SearchFoodsRequest` | `query: string` (trimmed, 1–256 characters); `category?: FoodCategory`; `limit?: number` (default 10, range 1–50); `offset?: number` (default 0, for paging) |
| `GetFoodRequest` | `foodId: string` (nonblank) |
| `LookupFoodByBarcodeRequest` | `upc: string` (trimmed, nonempty) |
| `SuggestFoodAlternativesRequest` | `foodId: string`; `dietRestrictions: DietRestriction[]`; `dietPreferences: DietPreference[]` |

Autocomplete trims the query and permits an empty prefix, but rejects more than
64 characters.

## Responses

`AutocompleteFoodsResponse.items` contains `FoodSuggestion`: string `id`,
`name`, nullable `brandName`, nullable `photoUrl`, and nullable
`NutritionFacts`.

`FoodSearchResults` contains `totalCount` and `items: FoodSearchItem[]`.
`totalCount` is the number of items in this response, not the total number of
matches; keep paging with `offset` while a full page comes back. `lookupBarcode`
returns one item.

`FoodSearchItem` includes `id`, `name`, `brandName`, flattened nullable nutrition
values, nullable glycemic values, `photoUrl`, and `barcode`, the complete nullable
`nutrients`, and `servings: ServingOption[]`.

`ServingOption` fields are `id`, `quantity`, `unit`, `scalingFactor`, `weightGrams`,
and `isPrimary`; every field except `id` can be `null`.

Alternatives returns `{ alternatives: AlternativeFood[] }`. Natural-language
meal descriptions are handled by `foodAnalysis.analyzeDescription`.

## Portion helper

```ts
FoodPortion.from(
  food: FoodSearchItem,
  options: { servingId?: string; quantity?: number } = {},
): FoodPortion
```

It selects the primary or first serving by default. `quantity` is an amount in
the serving's unit, and without one the portion is one serving; `selection`
sends the number of servings
([Quantity and servings](../concepts/food-lifecycle.md#quantity-and-servings)).
Quantity must be finite, positive, and at most 10,000. Failures throw
`FoodPortionError` with code `no_servings`, `serving_not_found`,
`invalid_serving`, or `invalid_quantity`.
