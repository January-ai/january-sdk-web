# Restaurants

```ts
const request = {
  query: 'mediterranean',
  latitude: 37.7749,
  longitude: -122.4194,
  radius: 8_000,
  limit: 10,
};

const restaurants = await january.restaurants.search(request);
const menuItems = await january.restaurants.searchMenuItems({
  ...request,
  query: 'grilled chicken',
});
```

## Load one restaurant's menu

Use an ID returned by restaurant search to load that restaurant's menu without
repeating the query or location:

```ts
let offset = 0;
const limit = 100;

while (true) {
  const page = await january.restaurants.getMenuItems({
    restaurantId: restaurant.id,
    limit,
    offset,
  });

  consume(page.items);
  offset += page.items.length;

  if (page.items.length < limit) break;
}
```

The response contains only `items`, with no `totalCount`; keep paging while a
full page comes back. An empty page ends the menu, including for a restaurant
with no menu on record. An unknown restaurant returns `404`.

Queries contain 1–256 characters, radius is 1–50,000 meters (8,000 when
omitted), limit is 1–100, and coordinates must be valid latitude and longitude
values. Menu items can include nutrition, serving choices, photos, restaurant
name, and distance.
