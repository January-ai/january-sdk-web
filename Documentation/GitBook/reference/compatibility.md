# Compatibility and packaging

| Requirement | Support |
| --- | --- |
| Node.js, for installing and building | 22 or newer |
| Modules | ESM only |
| TypeScript target | ES2022 |
| API calls from a browser | A modern browser with Fetch, on an origin January has enabled ([Runtime and security boundaries](../concepts/runtime-boundaries.md)) |
| `preparePhotoScanImage` | Browser image, canvas, `Blob`, and object-URL APIs |
| Voice recording | A secure context with `getUserMedia` and `MediaRecorder` |
| Voice transcription | Browser speech recognition, where available |
| Distribution | npm, [`@januaryai/web-sdk`](https://www.npmjs.com/package/@januaryai/web-sdk) |
| Package contents | ESM JavaScript, TypeScript declarations, source maps, README, and license |

The package is licensed under Apache 2.0.
