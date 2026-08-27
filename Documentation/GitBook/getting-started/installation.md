# Installation

## Current availability

The SDK is a controlled preview. The package name exists in this repository's
metadata but is not present in the npm registry. The repository is private;
January must grant your GitHub account access before you can clone it.

{% hint style="danger" %}
`npm install @januaryai/partner-sdk` does not work today. Installing the GitHub
repository directly also does not work: generated `dist` files are not tracked
and the package has no `prepare` script.
{% endhint %}

## 1. Clone and pin the source

Authenticate Git for the GitHub account January authorized. A browser-visible
`404` or `Repository not found` usually means that account lacks access. Then:

```bash
git clone https://github.com/January-ai/january-sdk-web.git
cd january-sdk-web
git checkout 46850f5372c437807c08b52d72e2bc34a2be552b
npm ci
npm test
```

That revision is the source checkout used to verify this guide. Move to a newer
revision only when January approves it; never track a moving branch.

## 2. Build the installable tarball

```bash
npm run build
npm pack
```

For the current preview version, this creates
`januaryai-partner-sdk-0.1.0.tgz`. `npm pack` includes the built JavaScript,
TypeScript declarations, source maps, generated transport, and package metadata.

## 3. Install it in the consuming project

```bash
cd ../your-application
npm install ../january-sdk-web/januaryai-partner-sdk-0.1.0.tgz
```

```ts
import { JanuaryPartnerClient } from '@januaryai/partner-sdk';
```

This build → pack → install → ESM import flow was verified against the current
repository. Rebuild and repack after changing the pinned commit.

## Future npm installation

After January publishes a release, this page will provide a verified versioned
npm command and upgrade policy. Do not use the future command until the package
is visible on npm and the announced version has release notes.
