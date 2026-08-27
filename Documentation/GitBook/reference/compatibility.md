# Compatibility and packaging

| Requirement | Current preview |
| --- | --- |
| Node.js | 22+ |
| Modules | ESM only |
| TypeScript target | ES2022 |
| Browser transport | Fetch-compatible modern browser **after January enables the exact origin** |
| Registry distribution | Not published |
| Verified distribution | Built local npm tarball |

The tarball includes JavaScript, declarations, declaration maps, source maps,
and the generated transport. The repository's `dist` directory is generated and
not tracked, so direct GitHub installation is not usable without a `prepare`
script.

The package is currently marked `UNLICENSED`. Treat it as controlled preview
software supplied under your January partner agreement, not as an open-source
npm release.

The production Partner API does not currently accept requests from an arbitrary
browser origin. Browser API access requires January-side origin configuration;
otherwise run the SDK in a trusted Node.js backend.
