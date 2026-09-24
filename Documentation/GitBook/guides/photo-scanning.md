# Food analysis

Scope: `food_analysis:write` (plus `food_logs:write` to log the result). `user` is the [scoped client](../concepts/client-lifecycle.md).

## Analyze a meal and log it

```ts
import { preparePhotoScanImage, type FoodSelection } from '@januaryai/web-sdk';

const file = fileInput.files?.[0];
if (!file) throw new Error('Choose a meal photo');

const { dataUri } = await preparePhotoScanImage(file);
const scan = await user.foodAnalysis.analyzePhoto({ image: dataUri, signal });
// Or a hosted image: analyzePhoto({ image: 'https://cdn.example.com/meal.jpg' })
// Or text: analyzeDescription({ query: 'two eggs and a slice of toast' })

const foods: FoodSelection[] = scan.detections.map(({ food }) => ({
  id: food.id,
  serving: { id: food.serving.id, quantity: food.quantity },
}));
if (foods.length > 0) {
  await user.foodLogs.create({ foods, name: scan.mealName ?? undefined });
}
```

* **Input.** `analyzePhoto` takes a base64 data URI or a publicly fetchable `http(s)` URL. `preparePhotoScanImage` builds the data URI in the browser: it keeps the aspect ratio, limits the longest edge to 1,000 pixels, and compresses to JPEG at quality 0.7. On a server, pass a URL or a data URI you prepare there. `analyzeDescription` takes a text description of up to 512 characters instead.
* **Time.** A complex meal can take tens of seconds. Show progress, and pass a `signal` so the user can cancel.
* **Image errors** are `validation` errors: `image_unreachable`, `image_corrupt`, `image_format_unsupported`, and `image_invalid_base64`. Retrying the same image fails the same way. A photo of only a barcode is rejected; use [`foods.lookupBarcode`](foods.md#barcodes-and-alternatives).
* **Result.** `detections` is empty when nothing was recognized, and `mealName` can be `null`. Each detection's `quantity` counts servings of `serving`, and its `nutrients` are already scaled to that quantity.

## Correct a result

Send the result back exactly as it was returned, with a plain-language instruction:

```ts
const corrected = await user.foodAnalysis.correct({
  analysis: scan,
  instruction: 'Remove the fries',
});
console.log(corrected.totalNutrients);
```

Keep meal images and nutrition out of analytics, crash reports, and general logs.
