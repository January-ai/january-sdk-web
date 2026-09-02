# Food analysis

In browsers, `preparePhotoScanImage` uses browser image and canvas APIs to
preserve aspect ratio, limit the longest edge to 1,000 pixels, JPEG-compress at
quality 0.7, and return an upload-ready data URI.

```ts
import { preparePhotoScanImage } from '@januaryai/web-sdk';

const file = fileInput.files?.[0];
if (!file) throw new Error('Choose a meal image');

const prepared = await preparePhotoScanImage(file);
const scan = await january.foodAnalysis.analyzePhoto({ image: prepared.dataUri });
```

Correct a result using its current name and detections:

```ts
const corrected = await january.foodAnalysis.correct({
  mealName: scan.mealName ?? 'Meal',
  detections: scan.detections ?? [],
  userInput: 'Remove the fries',
});
```

`preparePhotoScanImage` is browser-only; Node.js callers must prepare a supported
base64 data URI with server-side image tooling before calling `scan`. Do not put
meal images or inferred nutrition in analytics, crash reports, or general logs.
