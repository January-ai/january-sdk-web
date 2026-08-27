# Testing and support

## Verify the SDK checkout and package

```bash
npm ci
npm test
npm run build
npm pack --dry-run
npm run demo:web:build
```

For release-candidate packaging, run `npm pack`, install the resulting `.tgz`
into a clean temporary ESM project, and import `JanuaryPartnerClient`.

## Verify an integration

Test token success, both expiry spellings, exhausted provider retries,
single-flight concurrent refresh, one-time `token_expired` replay, cancellation,
autocomplete → search → hydration, photo preparation, and user/timezone changes.
Inspect the production browser bundle and network panel to prove that no partner
key is present.

## Versioning and updates

There is no npm release yet. Pin an approved Git commit, build a new tarball,
review the changelog and exported declaration diff, rerun the checks above, and
upgrade deliberately. Do not infer stability from the source version `0.1.0`.

## Support report

Include the pinned commit, Node/browser/framework versions, operation,
`JanuaryError` category/status/code/request ID, and reproduction. Exclude keys,
tokens, images, nutrition records, and health profiles.
