# January Partner SDK for Web and Node.js

Controlled-preview TypeScript SDK for January food discovery, restaurants,
meal-photo scanning, food logs, and glucose prediction.

> **Distribution status:** `@januaryai/partner-sdk` is not published on npm,
> and the source repository is private. January must grant your GitHub account
> access before you build and install a pinned local tarball using the
> [installation guide](Documentation/GitBook/getting-started/installation.md).

## Documentation

The [Web and Node.js SDK GitBook](Documentation/GitBook/README.md) covers the
runtime security boundary, backend token exchange, complete provider code, first
request, all resources, retries, cancellation, packaging, testing, and support.

## Evaluate and package the repository

```bash
git clone https://github.com/January-ai/partner-sdk-node.git
cd partner-sdk-node
git checkout f4039db3ecc3a94a82cd125ac8e22aebf964d11f
npm ci
npm test
npm run build
npm pack
```

Install the resulting `.tgz` in a consuming ESM project. Do not use the normal
npm registry command until January publishes and announces a release.

## Authentication rule

Never expose a long-lived January partner key in browser JavaScript. A browser
uses a short-lived token returned by its own authenticated backend. Start with
the [backend token endpoint](Documentation/GitBook/getting-started/backend-token-endpoint.md).
