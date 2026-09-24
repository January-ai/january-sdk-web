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

Autocomplete suggests text. Selecting a suggestion should fill the search field and run `search`, not open a serving picker. Search results are summaries: when the user picks one, fetch the full food with `foods.get` before showing servings.

```ts
import { FoodPortion } from '@januaryai/web-sdk';

const { items } = await user.foods.search({ query: 'banana' });
const selected = items[0];
if (!selected) throw new Error('No matching food');

// Search results are summaries: load the full food before showing servings.
const food = await user.foods.get({ foodId: selected.id });

// The primary serving at its listed quantity.
const portion = FoodPortion.from(food);
console.log(portion.serving.unit, portion.quantity, portion.nutrition.calories?.value);

await user.foodLogs.create({ foods: [portion.selection] });
```

`FoodPortion.from` calculates nutrition locally. Pass `servingId` to pick another serving and `quantity` to change the amount; `quantity` is in the serving's unit and defaults to the serving's listed quantity. Invalid serving data, or a quantity that isn't positive or is over 10,000, throws `FoodPortionError`.

`portion.selection` is what `foodLogs.create` and `glucose.predict` accept.
