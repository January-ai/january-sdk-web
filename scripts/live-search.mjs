import { JanuaryPartnerClient } from '../dist/index.js';

const apiKey = process.env.JANUARY_API_KEY;
if (!apiKey) throw new Error('JANUARY_API_KEY is not configured.');

const client = new JanuaryPartnerClient({ apiKey });
const result = await client.foods.search({
  query: 'banana',
  limit: 3,
  endUserId: process.env.JANUARY_END_USER_ID,
});

console.log(`PASS Node SDK live food search (${result.items.length} items)`);

