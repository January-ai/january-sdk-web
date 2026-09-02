# Installation

Build a package from the repository source:

```bash
git clone https://github.com/January-ai/january-sdk-web.git
cd january-sdk-web
npm ci
npm test
npm pack
```

The final command writes `januaryai-sdk-0.1.0.tgz`. Install that immutable
tarball into the application and commit the resulting lockfile:

```bash
npm install /path/to/januaryai-sdk-0.1.0.tgz
```

```ts
import { JanuaryClient } from '@januaryai/sdk';
```

The packed artifact is ESM-first and includes its TypeScript declarations.
Keep the tarball in an access-controlled artifact store and use the application
lockfile to make installs reproducible.

## Requirements

* Node.js 22 or newer for package installation and builds
* A modern browser with Fetch when calling January directly from an approved origin
* An authenticated partner backend that returns short-lived January client tokens
