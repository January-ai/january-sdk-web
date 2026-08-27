# Glucose prediction

Use typed measurement units and a scoped user client:

```ts
const prediction = await user.glucose.predict({
  userProfile: {
    age: 35,
    sex: Sex.male,
    height: { value: 70, unit: HeightUnit.inches },
    weight: { value: 175, unit: WeightUnit.pounds },
    activityLevel: ActivityLevel.moderatelyActive,
    healthConditions: [],
  },
  foods: [portion.selection],
  startTime: new Date(),
});
```

Height accepts inches or centimeters; weight accepts pounds or kilograms. A UI
should display imperial height as feet plus inches, not one raw-inch field.
Recent CGM readings and consumed foods are optional. Predictions are
informational and are not diagnosis or treatment guidance.
