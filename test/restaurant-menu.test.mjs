import assert from 'node:assert/strict';
import test from 'node:test';
import { JanuaryClient } from '../dist/index.js';
test('restaurant menu uses the selected ID and pagination without a diary header', async () => {
  let captured;
  const client = new JanuaryClient({developmentApiKey:'fixture-key',fetch:async (url,init)=>{
    captured={url:new URL(url),headers:new Headers(init.headers)};
    return new Response('{"items":[{"id":"101","name":"Bowl","nutrients":{"calories":{"value":220,"unit":"kcal"}},"glycemic_index":null,"glycemic_load":null,"servings":[{"id":"11","quantity":1,"unit":"bowl","scaling_factor":1,"weight_grams":null,"is_primary":true}]}]}',{headers:{'content-type':'application/json'}});
  }});
  const result=await client.restaurants.getMenuItems({restaurantId:'cafe-123',limit:2,offset:1,endUserId:'user-1'});
  assert.equal(captured.url.pathname,'/v1.2/restaurants/cafe-123/menu-items');
  assert.deepEqual(Object.fromEntries(captured.url.searchParams),{limit:'2',offset:'1'});
  assert.equal(captured.headers.get('january-end-user-id'),null);
  assert.equal(result.items.length,1);assert.equal(result.items[0].energy,220);
  assert.equal(result.items[0].servings[0].scalingFactor,1);
  await assert.rejects(client.restaurants.getMenuItems({restaurantId:'../other'}),TypeError);
});

test('restaurant searches accept a 50000-meter radius and reject 50001 locally', async () => {
  const requests = [];
  const client = new JanuaryClient({developmentApiKey:'fixture-key',fetch:async (url) => {
    requests.push(new URL(url));
    return new Response('{"items":[]}', {headers:{'content-type':'application/json'}});
  }});
  const input = {query:'cafe',latitude:40,longitude:-74,radius:50_000};

  await client.restaurants.search(input);
  await client.restaurants.searchMenuItems(input);

  assert.deepEqual(requests.map((url) => [url.pathname, url.searchParams.get('radius_meters')]), [
    ['/v1.2/restaurants', '50000'],
    ['/v1.2/menu-items', '50000'],
  ]);
  for (const method of ['search', 'searchMenuItems']) {
    for (const radius of [50_001, Number.NaN, Number.POSITIVE_INFINITY]) {
      await assert.rejects(
        client.restaurants[method]({...input,radius}),
        {name:'TypeError',message:'Restaurant radius must be a finite number between 1 and 50000 meters.'},
      );
    }
    for (const coordinates of [
      {latitude:Number.NaN},
      {latitude:Number.POSITIVE_INFINITY},
      {longitude:Number.NaN},
      {longitude:Number.NEGATIVE_INFINITY},
    ]) {
      await assert.rejects(
        client.restaurants[method]({...input,...coordinates}),
        {name:'TypeError',message:'Restaurant coordinates are outside the valid range.'},
      );
    }
  }
});


test('menu query stays scoped to the restaurant and supports full-menu reset and pagination', async () => {
  const urls = [];
  const client = new JanuaryClient({ developmentApiKey: 'fixture-key', fetch: async (url) => {
    urls.push(new URL(url));
    return new Response('{"items":[]}', { headers: { 'content-type': 'application/json' } });
  }});
  const scoped = client.forUser({ endUserId: 'fixture-user' });
  await scoped.restaurants.getMenuItems({ restaurantId: 'cafe-123', query: 'Burger & fries', limit: 500, offset: 100 });
  await client.restaurants.getMenuItems({ restaurantId: 'cafe-123', query: '' });
  await client.restaurants.getMenuItems({ restaurantId: 'cafe-123' });
  assert.equal(urls[0].pathname, '/v1.2/restaurants/cafe-123/menu-items');
  assert.deepEqual(Object.fromEntries(urls[0].searchParams), { query: 'Burger & fries', limit: '500', offset: '100' });
  assert.equal(urls[1].searchParams.get('query'), '');
  assert.equal(urls[2].searchParams.has('query'), false);
  for (const request of [{ query: 'x'.repeat(257) }, { limit: 501 }, { offset: -1 }, { restaurantId: 'x'.repeat(65) }]) {
    await assert.rejects(client.restaurants.getMenuItems({ restaurantId: 'cafe-123', ...request }), TypeError);
  }
  assert.equal(urls.length, 3);
});
