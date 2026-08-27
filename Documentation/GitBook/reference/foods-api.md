# Foods API

Every request accepts optional `endUserId?: string` and `signal?: AbortSignal`.
Client-token mode removes the end-user header because the token identifies the
user.

## Operations

```ts
autocomplete(request: AutocompleteFoodsRequest): Promise<AutocompleteFoodsResponse>
search(request: SearchFoodsRequest): Promise<FoodSearchResults>
getFood(request: GetFoodRequest): Promise<FoodSearchItem>
lookupBarcode(request: LookupFoodByBarcodeRequest): Promise<FoodSearchResults>
searchNaturalLanguage(
  request: SearchFoodsByNaturalLanguageRequest,
): Promise<SearchFoodsByNaturalLanguageResponse>
suggestAlternatives(
  request: SuggestFoodAlternativesRequest,
): Promise<SuggestFoodAlternativesResponse>
```

## Requests and defaults

| Request | Fields |
| --- | --- |
| `AutocompleteFoodsRequest` | `query: string`; `category?: AutocompleteFoodCategory`; `limit?: number` (default 8, range 1–20) |
| `SearchFoodsRequest` | `query: string` (trimmed, 1–256 characters); `category?: FoodCategory`; `limit?: number` (default 10, range 1–40) |
| `GetFoodRequest` | `foodId: number` (positive safe integer) |
| `LookupFoodByBarcodeRequest` | `upc: string` (trimmed, nonempty) |
| `SearchFoodsByNaturalLanguageRequest` | `query: string` (trimmed, nonempty) |
| `SuggestFoodAlternativesRequest` | `foodId: number`; `dietRestrictions: DietRestriction[]`; `dietPreferences: DietPreference[]` |

Autocomplete trims the query and permits an empty prefix, but rejects more than
64 characters.

## Responses

`AutocompleteFoodsResponse.items` contains `FoodSuggestion`: numeric `id`,
`name`, nullable `brandName`, nullable `photoUrl`, and nullable
`NutritionFacts`.

`FoodSearchResults` contains `totalCount` and `items: FoodSearchItem[]`.
`FoodSearchItem` includes ID/name/brand, flattened nullable nutrition values,
nullable glycemic values/photo/UPC, complete nullable `nutrients`, and
`servings: ServingOption[]`.

`ServingOption` fields are `id`, `quantity`, `unit`, `scalingFactor`, nullable
`weightGrams`, and `isPrimary`.

Natural-language search returns a `FoodScan`; alternatives returns
`{ alternatives: FoodAlternative[] }`.

## Portion helper

```ts
FoodPortion.from(
  food: FoodSearchItem,
  options: { servingId?: number; quantity?: number } = {},
): FoodPortion
```

It selects the primary or first serving by default and uses the serving quantity
by default. Quantity must be finite, positive, and at most 10,000. Failures throw
`FoodPortionError` with code `no_servings`, `serving_not_found`,
`invalid_serving`, or `invalid_quantity`.
