# Quick start

Create a provider-backed client in a browser or an API-key client in trusted
server code:

```ts
import { FoodCategory, JanuaryPartnerClient } from '@januaryai/partner-sdk';

const january = new JanuaryPartnerClient({
  clientTokenProvider: () => partnerBackend.createJanuaryToken(),
});

const results = await january.foods.search({
  query: 'greek yogurt',
  category: FoodCategory.branded,
  limit: 10,
});

for (const food of results.items) console.log(food.name);
```

Search queries contain 1–256 characters and limits are 1–40. SDK failures are
reported as `JanuaryError`; cancellation remains an `AbortError`.
