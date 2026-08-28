# Compatibility and packaging

| Requirement | Support |
| --- | --- |
| Node.js | 22+ |
| Modules | ESM only |
| TypeScript target | ES2022 |
| Browser transport | Fetch-compatible modern browser **after January enables the exact origin** |
| Registry distribution | npm (`@januaryai/sdk`) |
| Package contents | ESM JavaScript, TypeScript declarations, source maps, README, and license |

The package is licensed under Apache 2.0. Its `prepack` hook builds `dist`, so a
registry release cannot silently omit runtime JavaScript or declarations.

The production Partner API does not currently accept requests from an arbitrary
browser origin. Browser API access requires January-side origin configuration;
otherwise run the SDK in a trusted Node.js backend.
