import { FoodPortion, JanuaryPartnerClient } from '../dist/index.js';

const apiKey = process.env.JANUARY_API_KEY;
if (!apiKey) throw new Error('JANUARY_API_KEY is not configured.');

const client = new JanuaryPartnerClient({ apiKey });
const suggestions = await client.foods.autocomplete({
  query: 'ban',
  limit: 3,
  endUserId: process.env.JANUARY_END_USER_ID,
});
if (!suggestions.items.length) throw new Error('Autocomplete returned no suggestions.');

const result = await client.foods.search({
  query: 'banana',
  limit: 3,
  endUserId: process.env.JANUARY_END_USER_ID,
});
if (!result.items.length) throw new Error('Food search returned no results.');

const fullFood = await client.foods.get({
  foodId: result.items[0].id,
  endUserId: process.env.JANUARY_END_USER_ID,
});
const portion = FoodPortion.from(fullFood);

console.log(`PASS Node SDK live food discovery (${suggestions.items.length} suggestions, ${result.items.length} results, ${fullFood.servings.length} servings, ${portion.nutrition.calories?.value ?? 'unknown'} calories)`);
