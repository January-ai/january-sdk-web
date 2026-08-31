import assert from 'node:assert/strict';
import test from 'node:test';
import { JanuaryClient } from '../dist/index.js';
test('restaurant menu uses the selected ID, pagination, user context and normalized food data', async () => {
  let captured;
  const client = new JanuaryClient({developmentApiKey:'fixture-key',fetch:async (url,init)=>{
    captured={url:new URL(url),headers:new Headers(init.headers)};
    return new Response('{"total_count":3,"items":[{"type":"menu_item","id":"101","name":"Bowl","restaurant_name":"Cafe","nutrients":{"calories":{"value":220,"unit":"kcal"}},"image_url":"https://example.com/bowl.jpg","servings":[{"id":11,"quantity":1,"unit":"bowl","is_primary":true}]}]}',{headers:{'content-type':'application/json'}});
  }});
  const result=await client.restaurants.getMenuItems({restaurantId:'cafe-123',limit:2,offset:1,endUserId:'user-1'});
  assert.equal(captured.url.pathname,'/v1.2/restaurants/cafe-123/menu-items');
  assert.deepEqual(Object.fromEntries(captured.url.searchParams),{limit:'2',offset:'1'});
  assert.equal(captured.headers.get('x-end-user-id'),'user-1');
  assert.equal(result.totalCount,3);assert.equal(result.items[0].energy,220);
  assert.equal(result.items[0].photoUrl,'https://example.com/bowl.jpg');
  assert.equal(result.items[0].servings[0].scalingFactor,1);
  await assert.rejects(client.restaurants.getMenuItems({restaurantId:'../other'}),TypeError);
});
