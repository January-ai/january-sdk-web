# Restaurants

Scope: `restaurants:read`. `user` is the [scoped client](../concepts/client-lifecycle.md).

## Search near a location

```ts
const location = { latitude: 37.7749, longitude: -122.4194, radius: 8_000 };

const restaurants = await user.restaurants.search({ ...location, query: 'mediterranean', limit: 10 });
const dishes = await user.restaurants.searchMenuItems({ ...location, query: 'grilled chicken' });
dishes.items.forEach((dish) => console.log(dish.restaurantName, dish.name, dish.energy));
```

`radius` is in meters. Field limits are in the [reference](../reference/discovery-and-scanning-api.md#restaurants).

## Load one restaurant's menu

`getMenuItems` loads a restaurant's menu by the ID from `search`, without repeating the query or location. It returns pages of up to 100 items with no total count, so keep paging while a full page comes back:

```ts
import type { RestaurantMenuEntry } from '@januaryai/web-sdk';

async function loadMenu(restaurantId: string): Promise<RestaurantMenuEntry[]> {
  const menu: RestaurantMenuEntry[] = [];
  const limit = 100;
  while (true) {
    const page = await user.restaurants.getMenuItems({ restaurantId, limit, offset: menu.length });
    menu.push(...page.items);
    if (page.items.length < limit) return menu;
  }
}

const [restaurant] = restaurants.items;
if (restaurant) {
  const menu = await loadMenu(restaurant.id);
  menu.forEach((item) => console.log(item.name, item.energy, item.carbs, item.fat));
}
```

A restaurant with no menu on record returns an empty first page. An unknown restaurant fails with category `notFound`; in a discovery UI, fall back to `searchMenuItems` with the user's query and location when the first page is empty or the restaurant is not found.

Menu items use short nutrition names: `energy`, `protein`, `carbs`, `netCarbs`, `fat`, `fiber`, `sugars`, `addedSugars`, `gi`, and `gl`, not the `calories`, `carbohydrates`, and `totalFat` of foods.
