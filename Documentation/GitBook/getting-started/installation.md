# Installation

`@januaryai/sdk` is not currently published to npm. January must first grant
your GitHub account access to the private repository and provide the exact
revision approved for your integration.

Clone, verify, and package that revision:

```bash
git clone https://github.com/January-ai/january-sdk-web.git
cd january-sdk-web
git checkout <revision-supplied-by-january>
npm ci
npm test
npm pack
```

The final command writes `januaryai-sdk-0.1.0.tgz`. Install that immutable
tarball into the application and commit the resulting lockfile:

```bash
npm install /path/to/januaryai-sdk-0.1.0.tgz
```

Do not run `npm install @januaryai/sdk` until January announces a registry
release.

```ts
import { JanuaryClient } from '@januaryai/sdk';
```

The packed artifact is ESM-first and includes its TypeScript declarations.
Keep the tarball in an access-controlled artifact store and use the application
lockfile to make installs reproducible.

## Requirements

* Node.js 22 or newer for server-side use
* A modern browser with Fetch when calling January directly from an approved origin
* An authenticated partner backend that returns short-lived January client tokens
