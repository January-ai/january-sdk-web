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

// One primary serving.
const portion = FoodPortion.from(food);
console.log(portion.serving.unit, portion.quantity, portion.nutrition.calories?.value);

await user.foodLogs.create({ foods: [portion.selection] });

// With a "6 oz" primary serving: 9 oz, one and a half servings.
const larger = FoodPortion.from(food, { quantity: 9 });
```

`FoodPortion.from` calculates nutrition locally. Pass `servingId` to pick another serving and `quantity` to change the amount. Invalid serving data, or a quantity that isn't positive or is over 10,000, throws `FoodPortionError`.

`portion.selection` is what `foodLogs.create` and `glucose.predict` accept.

## Quantity and servings

`quantity` is an amount in the serving's unit, not a number of servings. For a "6 oz" serving (`quantity` 6, `unit` "oz"), `quantity: 9` means 9 oz, and leaving `quantity` out means one serving (6 oz). `portion.selection` sends the number of servings, `quantity` divided by the serving's own quantity, so 9 oz of a "6 oz" serving is logged as 1.5 servings. Versions before 0.3.1 sent `quantity` itself as the number of servings, so food logs and glucose predictions got the wrong amount (a default "6 oz" portion was logged as 6 servings); upgrade to 0.3.1.
