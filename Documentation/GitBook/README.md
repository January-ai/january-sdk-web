# January Web SDK

Typed Promise-based APIs for food discovery, restaurants, food analysis, food
logs, and glucose prediction in modern browser applications.

## Start here

1. [Install the SDK package](getting-started/installation.md).
2. Choose the correct [runtime and security boundary](concepts/runtime-boundaries.md).
3. Build a partner-owned [backend token endpoint](getting-started/backend-token-endpoint.md).
4. Configure authentication and run the [first request](getting-started/quick-start.md).
5. Follow the [food hydration and serving flow](concepts/food-lifecycle.md).

## Security model

Production SDK authentication uses client tokens. Browser code obtains a
short-lived token from an authenticated application backend. The SDK has no
token-endpoint URL and no public January base-URL override.

```text
Browser ── authenticated request ──▶ Partner backend ── private exchange ──▶ January
Browser ◀────── { token, expiresIn } ────────────────────────────────────┘
Browser ───── Authorization: Bearer ct-… ─────────────────────────────▶ January
```

## Requirements

* Node.js 22+ for package installation, builds, and repository tooling
* ESM (`import`) projects
* Modern Fetch, `AbortController`, `Headers`, and browser image APIs where used
