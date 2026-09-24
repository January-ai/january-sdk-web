# Foods API

Every request accepts optional `endUserId?: string` and `signal?: AbortSignal`.
Food requests never send `January-End-User-ID`: the foods endpoints don't depend
on who is asking, so `endUserId` remains only for source compatibility.

Prefer `january.forUser(...).foods`; it exposes the same operations without an
`endUserId` field in each request.

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
`FoodSearchItem` includes ID/name/brand, flattened nullable nutrition values,
nullable glycemic values/photo/UPC, complete nullable `nutrients`, and
`servings: ServingOption[]`.

`ServingOption` fields are `id`, `quantity`, `unit`, `scalingFactor`, nullable
`weightGrams`, and `isPrimary`.

Alternatives returns `{ alternatives: AlternativeFood[] }`. Natural-language
meal descriptions are handled by `foodAnalysis.analyzeDescription`.

## Portion helper

```ts
FoodPortion.from(
  food: FoodSearchItem,
  options: { servingId?: string; quantity?: number } = {},
): FoodPortion
```

It selects the primary or first serving by default and uses the serving quantity
by default. Quantity must be finite, positive, and at most 10,000. Failures throw
`FoodPortionError` with code `no_servings`, `serving_not_found`,
`invalid_serving`, or `invalid_quantity`.
