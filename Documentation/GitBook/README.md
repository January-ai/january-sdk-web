# January Web SDK

<mark style="color:white;background-color:orange;">**Beta**</mark> TypeScript SDK for browser apps: food search, restaurants, food analysis, food, water, and weight logs, glucose prediction, and in-browser voice capture. Code that holds your `sk-…` API key runs on your server, for example with the Node.js SDK, `@januaryai/server`.

## Start here

1. Check where your January calls can run. A browser can call January only from origins January has enabled: [Runtime and security boundaries](concepts/runtime-boundaries.md).
2. [Install the SDK](getting-started/installation.md).
3. Add a [backend token endpoint](getting-started/backend-token-endpoint.md), or run the token relay until you have one.
4. [Connect the client](getting-started/authentication.md) and make the [first request](getting-started/quick-start.md).
5. Load foods and servings: [Food discovery and servings](concepts/food-lifecycle.md).

## How authentication works

Your browser code gets a short-lived client token (`ct-…`) from an endpoint on your backend, and the SDK sends it to January. The SDK caches the token in memory and asks for a new one before it expires. The SDK always calls January's production API; you supply only the function that fetches the token. See [How authentication works](https://docs.january.ai/docs/authentication#client-tokens).

Supported runtimes and browsers are listed in [Compatibility](reference/compatibility.md).
