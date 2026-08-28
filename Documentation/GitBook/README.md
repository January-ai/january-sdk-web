# January SDK for Web and Node.js

Typed Promise-based APIs for food discovery, restaurants, food analysis,
food logs, and glucose prediction in Node.js services and modern browsers.

## Start here

1. [Install the npm package](getting-started/installation.md).
2. Choose the correct [runtime and security boundary](concepts/runtime-boundaries.md).
3. Build a partner-owned [backend token endpoint](getting-started/backend-token-endpoint.md).
4. Configure authentication and run the [first request](getting-started/quick-start.md).
5. Follow the [food hydration and serving flow](concepts/food-lifecycle.md).

## Security model

Production SDK authentication uses client tokens. Browser and Node.js code
obtain a short-lived token from an authenticated application backend. The SDK
has no token-endpoint URL and no public January base-URL override.

```text
Browser ── authenticated request ──▶ Partner backend ── private exchange ──▶ January
Browser ◀────── { token, expiresIn } ────────────────────────────────────┘
Browser ───── Authorization: Bearer ct-… ─────────────────────────────▶ January
```

## Requirements

* Node.js 22+ for server-side use and repository tooling
* ESM (`import`) projects
* A GitHub account authorized for the private SDK repository
* Modern Fetch, `AbortController`, `Headers`, and browser image APIs where used

{% hint style="danger" %}
Direct browser calls to January are deployment-gated. The production Partner API
does not currently accept a generic browser CORS preflight. Do not ship the
browser → January path until January confirms your exact web origin is enabled;
use the SDK in your trusted Node.js backend in the meantime.
{% endhint %}
