# Foods

Scope: `foods:read`. `user` is the [scoped client](../concepts/client-lifecycle.md).

## Autocomplete and search

```ts
const suggestions = await user.foods.autocomplete({ query: 'ban', limit: 8 });
const results = await user.foods.search({ query: 'banana', limit: 10, offset: 0 });
console.log(suggestions.items.map((item) => item.name), results.items.length);
```

Selecting a suggestion should fill the search field and run `search`. Search results are summaries; before showing servings, load the full food with `foods.get` and build a portion, as in [Food discovery and servings](../concepts/food-lifecycle.md). To page through results, raise `offset` while a full page comes back.

## Barcodes and alternatives

```ts
import { DietPreference, DietRestriction, JanuaryError } from '@januaryai/web-sdk';

try {
  const { items: [product] } = await user.foods.lookupBarcode({ upc: '012345678905' });
  console.log(product?.name);
} catch (error) {
  if (error instanceof JanuaryError && error.category === 'notFound') {
    // Not in the catalog: fall back to text search.
  } else {
    throw error;
  }
}

const { alternatives } = await user.foods.suggestAlternatives({
  foodId,
  dietRestrictions: [DietRestriction.dairy],
  dietPreferences: [DietPreference.vegetarian],
});
console.log(alternatives.map((food) => food.name));
```

Barcode coverage is US-only. A code issued outside the United States (for example GS1 prefixes 73, 64, 54, or 93) isn't in the catalog and fails with category `notFound` (404), so fall back to text search.

To turn a meal description into foods, use [food analysis](photo-scanning.md). Every request accepts an `AbortSignal` as `signal`.
