# Food discovery and servings

```text
autocomplete ── selection ──▶ search ── selected result ──▶ get
                                                           │
                                                           ▼
                                                   serving + quantity
                                                           │
                                                           ▼
                                                      FoodPortion
```

Autocomplete is a text-suggestion step. Selecting a suggestion should populate
the search field and run `search`; it should not open a serving picker. After a
search result is selected, call `get` before showing servings.

```ts
import { FoodPortion } from '@januaryai/web-sdk';

const results = await january.foods.search({ query: 'banana' });
const selected = results.items[0];
if (!selected) throw new Error('No matching food');

const food = await january.foods.get({ foodId: selected.id });
const serving = food.servings.find((item) => item.isPrimary) ?? food.servings[0];
if (!serving) throw new Error('Food has no serving options');

const portion = FoodPortion.from(food, {
  servingId: serving.id,
  quantity: 1.5,
});

console.log(portion.nutrition.calories?.value);
const apiSelection = portion.selection;
```

`portion.selection` is accepted by Food Logs and Glucose. Catch
`FoodPortionError` when serving or quantity data is invalid.
