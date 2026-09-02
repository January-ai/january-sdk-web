# Compatibility and packaging

| Requirement | Support |
| --- | --- |
| Package tooling | Node.js 22+ |
| Modules | ESM only |
| TypeScript target | ES2022 |
| Browser transport | Fetch-compatible modern browser **after January enables the exact origin** |
| Voice recording | Secure-context browser with `getUserMedia` and `MediaRecorder` |
| Voice transcription | Optional browser speech-recognition capability |
| Registry distribution | npm (`@januaryai/web-sdk`) |
| Package contents | ESM JavaScript, TypeScript declarations, source maps, README, and license |

The package is licensed under Apache 2.0. Its `prepack` hook builds `dist`, so a
registry release cannot silently omit runtime JavaScript or declarations.

The production Partner API does not currently accept requests from an arbitrary
browser origin. Browser API access requires January-side origin configuration;
otherwise route January API operations through the application backend.

Voice capture is entirely local to the browser and does not require January API
origin enablement. The browser chooses the recording MIME type. Applications
must keep a text-input fallback because speech recognition is not available in
every browser even when audio recording is supported.
