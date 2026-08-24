import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { JanuaryPartnerClient } from '../dist/index.js';

const burgerImageUrl = 'https://friendlysrestaurants.com/assets/live/img/production/detail/menu/lunch-dinner_999-combohs_all-american-burger-fries.jpg';

test('photo scan sends the public URL and PNG data URI through the public client', async () => {
  const fixture = await readFile(new URL('./fixtures/photo-scanning/burger-and-fries.png', import.meta.url));
  const dataUri = `data:image/png;base64,${fixture.toString('base64')}`;
  const requests = [];
  const fetch = async (input, init) => {
    requests.push({ url: String(input), init });
    return new Response(JSON.stringify({ meal_name: 'Burger and fries', detections: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const client = new JanuaryPartnerClient({ apiKey: 'fixture-key', baseUrl: 'https://example.test', fetch });

  await client.photoScanning.scan({ image: burgerImageUrl });
  await client.photoScanning.scan({ image: dataUri });

  assert.equal(requests.length, 2);
  assert.ok(requests.every(({ url }) => new URL(url).pathname === '/v1.2/food-scans/photo'));
  assert.ok(requests.every(({ init }) => init.method === 'POST'));
  assert.equal(JSON.parse(requests[0].init.body).image, burgerImageUrl);
  const encodedImage = JSON.parse(requests[1].init.body).image;
  assert.match(encodedImage, /^data:image\/png;base64,/);
  assert.deepEqual(Buffer.from(encodedImage.slice(encodedImage.indexOf(',') + 1), 'base64'), fixture);
});
