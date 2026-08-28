# Testing and support

## Verify the SDK checkout and package

```bash
npm ci
npm test
npm run build
npm pack --dry-run
npm run demo:web:build
```

For a release candidate, inspect `npm pack --dry-run`, install the resulting
tarball into a clean temporary ESM project, and import `JanuaryClient`.

## Verify an integration

Test token success, both expiry spellings, exhausted provider retries,
single-flight concurrent refresh, one-time `token_expired` replay, cancellation,
autocomplete → search → hydration, photo preparation, and user/timezone changes.
Inspect the production browser bundle and network panel to prove that no partner
key is present.

## Versioning and updates

Use your package-manager lockfile, review the changelog and exported declaration
diff, rerun the checks above, and upgrade deliberately.

## Support report

Include the pinned commit, Node/browser/framework versions, operation,
`JanuaryError` category/status/code/request ID, and reproduction. Exclude keys,
tokens, images, nutrition records, and health profiles.
