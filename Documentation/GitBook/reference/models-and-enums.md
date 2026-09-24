# Models and enums

## Client context

`PartnerUserContext` has required nonblank `endUserId` and optional IANA
`endUserTimezone`. `forUser` freezes a trimmed copy and does not persist it.

## Food values

* `FoodCategory`: `generic`, `branded`, `recipe`; `general` is a deprecated alias of `generic`
* `AutocompleteFoodCategory`: `generic`, `branded`; `general` is a deprecated alias of `generic`
* `DietPreference`: vegetarian, vegan, keto, paleo, pescatarian, low
  carbohydrate, high protein, kosher, and halal constants.
* `DietRestriction`: gluten, lactose, yeast, tree nuts, peanuts, dairy, eggs,
  sulfites, soy, wheat, shellfish, fish, mushrooms, sesame, MSG, caffeine, and
  FODMAP constants.

`NutritionFacts` has 16 optional `NutrientAmount` (`{ value: number; unit: string }`)
properties: `calories`, `protein`, `carbohydrates`, `netCarbohydrates`,
`totalFat`, `saturatedFat`, `transFat`, `fiber`, `totalSugars`, `addedSugars`,
`cholesterol`, `calcium`, `iron`, `potassium`, `sodium`, and `vitaminD`.

`FoodSelection` is `{ id: string; serving: { id: string; quantity: number } }`
and is what `foodLogs.create`, `foodLogs.update`, and `glucose.predict` accept.
Its `serving.quantity` is the number of servings eaten; `FoodPortion.selection`
converts a portion's amount to it
([Quantity and servings](../concepts/food-lifecycle.md#quantity-and-servings)).

* `FoodLogSummaryGrouping`: `day`, `week`
* `WeekStart`: `monday`, `sunday`
* `AnalysisEffort`: `none`, `xhigh`

`ServingSummary` (`{ id: string; quantity: number; unit: string | null; weightGrams: number | null }`)
is the catalog serving a detected or alternative food refers to
(`LoggedFood.servingDetails` is a `ServingDetails` with the same shape);
`quantity` is the size of one serving and `weightGrams` is null when unknown.

## Water and weight logs

* `VolumeUnit`: `fluidOunces` (`'fl_oz'`), `milliliters` (`'ml'`), `cups` (`'cup'`, a US cup of 8 fl oz)
* `WeightUnit`: `pounds` (`'lb'`), `kilograms` (`'kg'`)

`WaterAmount` and `Weight` are `{ value: number; unit }` inputs restricted to
those enums. `Volume` and `WeightMeasurement` are the same shape in responses
(`WaterLog.amount`, `DailyWaterTotal.total`, `WeightLog.weight`,
`DailyWeight.weight`); their `unit` is one of the enum values today and a value
January adds later is passed through as a string.

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

API and network failures reject with `JanuaryError`, which has `category`,
optional `status`, optional `code`, optional `requestId`, and `cause`.
`category` is one of `authentication`, `authorization`, `validation`,
`notFound`, `rateLimit`, `server`, `transport`, or `unknown`. Invalid input,
`FoodPortionError`, and cancellation are covered in
[Error handling](error-handling.md).
