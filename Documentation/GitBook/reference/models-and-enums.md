# Models and enums

## Client context

`PartnerUserContext` has required nonblank `endUserId` and optional IANA
`endUserTimezone`. `forUser` freezes a trimmed copy and does not persist it.

## Food values

* `FoodCategory`: `general`, `branded`, `recipe`
* `AutocompleteFoodCategory`: `general`, `branded`
* `DietPreference`: vegetarian, vegan, keto, paleo, pescatarian, low
  carbohydrate, high protein, kosher, and halal constants.
* `DietRestriction`: gluten, lactose, yeast, tree nuts, peanuts, dairy, eggs,
  sulfites, soy, wheat, shellfish, fish, mushrooms, sesame, MSG, caffeine, and
  FODMAP constants.

`NutritionFacts` uses optional `{ value: number; unit: string }` amounts for
calories, protein, carbohydrates, net carbohydrates, fats, fiber, sugars,
cholesterol, calcium, iron, potassium, sodium, and vitamin D.

`FoodSelection` is `{ id: number; serving: { id: number; quantity: number } }`
and is accepted by Food Logs and Glucose.

## Glucose profile

```ts
interface GlucosePredictionProfile {
  age: number;
  sex: Sex;
  height: { value: number; unit: HeightUnit };
  weight: { value: number; unit: WeightUnit };
  activityLevel?: ActivityLevel;
  healthConditions?: MedicalCondition[];
}
```

* `Sex`: `male`, `female`
* `HeightUnit`: `inches` (`'in'`), `centimeters` (`'cm'`)
* `WeightUnit`: `pounds` (`'lb'`), `kilograms` (`'kg'`)
* `ActivityLevel`: sedentary, lightly active, moderately active, very active
* `MedicalCondition`: type 2 diabetes, prediabetes

## Errors

HTTP/transport operations throw `JanuaryError` with `category`, optional
`status`, optional `code`, optional `requestId`, and a cause. Categories are
`authentication`, `authorization`, `validation`, `notFound`, `rateLimit`,
`server`, `transport`, and `unknown`.

Local request validation throws `TypeError` or `RangeError`. Portion failures
throw `FoodPortionError`. Cancellation propagates as `AbortError`.
