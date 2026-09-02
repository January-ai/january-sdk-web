# Installation

Install the public package from npm:

```bash
npm install @januaryai/web-sdk
```

```ts
import { JanuaryClient } from '@januaryai/web-sdk';
```

The package is ESM-first and includes its TypeScript declarations. Commit your
application lockfile to make installs reproducible.

## Requirements

* Node.js 22 or newer for package installation and builds
* A modern browser with Fetch when calling January directly from an approved origin
* An authenticated partner backend that returns short-lived January client tokens
