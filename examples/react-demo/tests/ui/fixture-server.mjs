import { createServer } from 'node:http'

const rules = new Map()
const requests = []

const nutrients = { calories: { value: 100, unit: 'kcal' }, protein: { value: 4, unit: 'g' } }
const servings = [{ id: '11', quantity: 1, unit: 'bowl', scaling_factor: 1, weight_grams: null, is_primary: true }]
const food = {
  id: 'food-1', type: 'generic', name: 'Fixture Pizza', brand_name: null, nutrients,
  glycemic_index: 52, glycemic_load: 12, image_url: null, barcode: '012345678905', servings,
}
const foodLog = {
  id: 'log-1', name: 'Fixture lunch', eaten_at: '2026-09-01T16:00:00Z',
  foods: [{
    food_id: food.id, name: food.name, brand_name: null, image_url: null,
    glycemic_index: 52, glycemic_load: 12, nutrients,
    quantity: 1, serving: { id: '11', quantity: 1, unit: 'bowl', weight_grams: null },
  }],
}
const directItems = [
  { id: '101', name: 'Fixture bowl', nutrients, glycemic_index: null, glycemic_load: null, servings },
  { id: '102', name: 'Fixture soup', nutrients, glycemic_index: null, glycemic_load: null, servings },
]
const searchItems = directItems.map((item) => ({
  type: 'menu_item',
  id: item.id,
  name: item.name,
  restaurant_name: 'Fixture Cafe',
  is_chain: false,
  distance_meters: 100,
  image_url: null,
  nutrients: item.nutrients,
  glycemic_index: item.glycemic_index,
  glycemic_load: item.glycemic_load,
  servings: item.servings,
}))

function json(response, value, status = 200) {
  response.writeHead(status, { 'content-type': 'application/json' })
  response.end(JSON.stringify(value))
}

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1:18767')
  if (url.pathname === '/__reset') {
    rules.clear(); requests.length = 0; return json(response, {})
  }
  if (url.pathname === '/__control') {
    rules.set(url.searchParams.get('route'), {
      status: Number(url.searchParams.get('status') ?? 200),
      empty: url.searchParams.get('empty') === 'true',
    })
    return json(response, {})
  }
  if (url.pathname === '/__requests') return json(response, requests)

  requests.push({ method: request.method, path: url.pathname, query: Object.fromEntries(url.searchParams) })
  const rule = rules.get(url.pathname) ?? { status: 200, empty: false }
  if (rule.status !== 200) {
    const message = rule.status === 404
      ? 'No restaurant with id cafe. Use an id from a GET /v1.2/restaurants result.'
      : 'The test request could not be completed.'
    return json(response, { code: rule.status === 404 ? 'not_found' : 'fixture_error', message }, rule.status)
  }
  if (url.pathname === '/health') return json(response, { ok: true })
  if (url.pathname === '/api/january/token') return json(response, {
    token: 'ct-fixture-token', expires_in: 1800, expires_at: new Date(Date.now() + 1_800_000).toISOString(),
    end_user_id: request.headers['x-end-user-id'], scopes: ['foods:read', 'restaurants:read'],
  })
  if (url.pathname === '/api/january/token/revoke') return json(response, { revoked_count: 1 })
  if (url.pathname === '/v1.2/foods/autocomplete') return json(response, { items: rule.empty ? [] : [{
    id: food.id, name: food.name, brand_name: null, image_url: null, nutrients,
  }] })
  if (url.pathname === '/v1.2/foods') return json(response, { items: rule.empty ? [] : [food] })
  if (url.pathname === '/v1.2/foods/barcode/012345678905') return json(response, food)
  if (url.pathname === '/v1.2/foods/food-1') return json(response, food)
  if (url.pathname === '/v1.2/food-analysis/text') return json(response, {
    meal_name: 'Fixture meal', total_nutrients: nutrients,
    detections: rule.empty ? [] : [{ confidence: 'high', food: {
      id: food.id, name: food.name, brand_name: null, nutrients, servings,
    } }],
  })
  if (url.pathname === '/v1.2/food-analysis/image') return json(response, {
    meal_name: 'Fixture photo meal', total_nutrients: nutrients,
    detections: rule.empty ? [] : [{ confidence: 'high', food: {
      id: food.id, name: food.name, brand_name: null, nutrients, servings,
    } }],
  })
  if (url.pathname === '/v1.2/glucose/predictions') return json(response, {
    impact_score: 'medium', chart: { min: 90, max: 140 },
    points: [{ minutes: 0, value: 95 }, { minutes: 45, value: 132 }, { minutes: 120, value: 98 }],
  })
  if (url.pathname === '/v1.2/food-logs' && request.method === 'GET') return json(response, {
    items: rule.empty ? [] : [foodLog],
  })
  if (url.pathname === '/v1.2/food-logs' && request.method === 'POST') return json(response, foodLog, 201)
  if (url.pathname === '/v1.2/food-logs/log-1' && request.method === 'PATCH') return json(response, foodLog)
  if (url.pathname === '/v1.2/food-logs/log-1' && request.method === 'DELETE') {
    response.writeHead(204); return response.end()
  }
  if (url.pathname === '/v1.2/restaurants') return json(response, { items: rule.empty ? [] : [{
    type: 'restaurant', id: 'cafe', name: 'Fixture Cafe', is_chain: false,
    distance_meters: 100, city: 'San Francisco', address1: '123 Test Street', address2: null,
  }] })
  if (url.pathname === '/v1.2/restaurants/cafe/menu-items') return json(response, { items: rule.empty ? [] : directItems })
  if (url.pathname === '/v1.2/menu-items') return json(response, { items: rule.empty ? [] : searchItems })
  return json(response, { code: 'not_found', message: `Unmapped fixture route ${url.pathname}` }, 404)
}).listen(18767, '127.0.0.1')
