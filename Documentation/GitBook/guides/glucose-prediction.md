# Glucose prediction

Scope: `glucose:read`. `user` is the [scoped client](../concepts/client-lifecycle.md), and `portion` comes from [Food discovery and servings](../concepts/food-lifecycle.md).

```ts
import { ActivityLevel, HeightUnit, Sex, WeightUnit } from '@januaryai/web-sdk';

const feet = 5;
const inches = 10;

const prediction = await user.glucose.predict({
  userProfile: {
    age: 35,
    sex: Sex.male,
    height: { value: feet * 12 + inches, unit: HeightUnit.inches },
    weight: { value: 175, unit: WeightUnit.pounds },
    activityLevel: ActivityLevel.moderatelyActive,
  },
  foods: [portion.selection],
  startTime: new Date(),
});

prediction.prediction.forEach(({ minutes, value }) => console.log(minutes, value));
console.log(prediction.impact, prediction.chart.min, prediction.chart.max);
```

* **Profile.** Height is in inches or centimeters and weight in pounds or kilograms. Ask for imperial height as feet and inches and convert, as above. `activityLevel` and `healthConditions` are optional.
* **Timezone.** The prediction depends on the meal's local time of day, so the scoped client's timezone is sent with it (UTC when unset).
* **Result.** `prediction` is the curve at 15-minute steps: `minutes` after `startTime` and the glucose `value` in mg/dL. `impact` grades the meal `low`, `medium`, or `high` (or `null`). `chart.min` and `chart.max` are suggested y-axis bounds, not the curve's extremes.
* **Personalization.** To tailor the prediction to one person, also send `cgmData` (recent CGM readings) and `consumedFoods` (the meals eaten over the same period). January needs at least five complete days of both; fewer fails with a `validation` error. Without them you get a standard prediction.

Predictions are informational, not a diagnosis or treatment guidance.
