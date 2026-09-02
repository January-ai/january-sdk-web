# Releasing the Web SDK

1. Update `version` in `package.json` and record the change in `CHANGELOG.md` on `main`.
2. Create a GitHub Release whose tag is exactly `v<package version>`.
3. Mark versions containing a SemVer prerelease suffix as GitHub prereleases.

The release workflow accepts tags that point to `main`, runs the SDK and complete
React demo test suites, checks the package archive, and publishes through npm
trusted publishing. Stable versions update npm's `latest` tag; prereleases update
`next`. The workflow then installs the exact version from the public registry in a
clean project.

The React demo intentionally depends on `file:../..` so pull requests test the SDK
checkout under review. It must not depend on npm's `latest` tag.
