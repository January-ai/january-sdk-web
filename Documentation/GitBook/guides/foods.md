# Foods

Use `january.foods` for autocomplete, search, full food hydration, barcode
lookup, meal-description parsing, and dietary alternatives.

```ts
const suggestions = await january.foods.autocomplete({ query: 'ban', limit: 8 });
```

Selecting a suggestion should populate the search field and run `search`.
Before opening a serving picker, hydrate the selected search result:

```ts
const results = await january.foods.search({ query: 'banana' });
const food = await january.foods.getFood({ foodId: results.items[0].id });
const portion = FoodPortion.from(food, {
  servingId: food.servings[0].id,
  quantity: 1.5,
});

console.log(portion.nutrition.calories?.value);
console.log(portion.selection);
```

Use `lookupBarcode`, `searchNaturalLanguage`, and `suggestAlternatives` for the
other discovery flows. Pass an `AbortSignal` on any request when cancellation is
needed.
