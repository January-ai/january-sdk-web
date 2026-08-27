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

Queries contain 1–256 characters, radius is 1–17,000, limit is 1–100, and
coordinates must be valid latitude and longitude values. Menu items can include
nutrition, serving choices, photos, restaurant name, and distance.
