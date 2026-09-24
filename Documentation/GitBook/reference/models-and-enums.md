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

`NutritionFacts` uses optional `{ value: number; unit: string }` amounts for
calories, protein, carbohydrates, net carbohydrates, fats, fiber, sugars,
cholesterol, calcium, iron, potassium, sodium, and vitamin D.

`FoodSelection` is `{ id: string; serving: { id: string; quantity: number } }`
and is accepted by Food Logs and Glucose.

* `FoodLogSummaryGrouping`: `day`, `week`
* `WeekStart`: `monday`, `sunday`
* `AnalysisEffort`: `none`, `xhigh`

`ServingSummary` (`{ id: string; quantity: number; unit: string | null; weightGrams: number | null }`)
is the catalog serving a detected, alternative, or logged food refers to;
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

HTTP/transport operations throw `JanuaryError` with `category`, optional
`status`, optional `code`, optional `requestId`, and a cause. Categories are
`authentication`, `authorization`, `validation`, `notFound`, `rateLimit`,
`server`, `transport`, and `unknown`.

Local request validation throws `TypeError` or `RangeError`. Portion failures
throw `FoodPortionError`. Cancellation propagates as `AbortError`.
