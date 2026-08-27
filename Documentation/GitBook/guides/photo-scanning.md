# Photo scanning

In browsers, `preparePhotoScanImage` applies browser-exposed orientation,
preserves aspect ratio, limits the longest edge to 1,000 pixels, JPEG-compresses
at quality 0.7, and returns an upload-ready data URI.

```ts
const prepared = await preparePhotoScanImage(file);
const scan = await january.photoScanning.scan({ image: prepared.dataUri });
```

Correct a result using its current name and detections:

```ts
const corrected = await january.photoScanning.correct({
  mealName: scan.mealName ?? 'Meal',
  detections: scan.detections ?? [],
  userInput: 'Remove the fries',
});
```

Meal images and inferred nutrition can be sensitive. Do not place them in
analytics, crash reports, or general-purpose logs.
