# January Partner SDK for Web and Node.js

Build food, nutrition, and metabolic experiences with fully typed,
Promise-based TypeScript APIs. The SDK supports trusted Node.js services and
browser applications backed by short-lived client tokens.

{% hint style="warning" %}
Never expose a long-lived January partner key to browser JavaScript. Production
web apps obtain short-lived client tokens from their authenticated backend.
{% endhint %}

## Requirements

* Node.js 22 or later for server-side use and tooling
* ESM (`import`) projects
* A modern Fetch-compatible browser for client-side use

## Quick integration path

1. [Install the package](getting-started/installation.md).
2. [Choose the correct authentication boundary](getting-started/authentication.md).
3. Create `JanuaryPartnerClient`.
4. Run a [food search](getting-started/quick-start.md).
5. Explore the [React demo](getting-started/example-app.md).

```ts
const january = new JanuaryPartnerClient({
  clientTokenProvider: () => partnerBackend.createJanuaryToken(),
});
const results = await january.foods.search({ query: 'greek yogurt' });
```
