# Installation

Install the latest release from npm:

```bash
npm install @januaryai/sdk
```

```ts
import { JanuaryClient } from '@januaryai/sdk';
```

The package is ESM-first and includes its TypeScript declarations. Use the
package manager lockfile in your application to keep installs reproducible.

## Requirements

* Node.js 22 or newer for server-side use
* A modern browser with Fetch when calling January directly from an approved origin
* An authenticated partner backend that returns short-lived January client tokens
