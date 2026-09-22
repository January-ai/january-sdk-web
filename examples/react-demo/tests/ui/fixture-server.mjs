import { createServer } from 'node:http'

const rules = new Map()
const requests = []

const nutrients = { calories: { value: 100, unit: 'kcal' }, protein: { value: 4, unit: 'g' } }
const servings = [{ id: '11', quantity: 1, unit: 'bowl', scaling_factor: 1, weight_grams: null, is_primary: true }]
const food = {
  id: 'food-1', type: 'generic', name: 'Fixture Pizza', brand_name: null, nutrients,
  glycemic_index: 52, glycemic_load: 12, image_url: null, barcode: '012345678905', servings,
}
// An hour ago, but never before today's local midnight, so the seeded log
// always falls in the demo's default "today" range.
const seededEatenAt = () => {
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
  const anHourAgo = Date.now() - 60 * 60 * 1000
  return new Date(Math.max(anHourAgo, startOfToday.getTime() + 60 * 1000)).toISOString().replace(/\.\d{3}Z$/, 'Z')
}
const foodLog = {
  id: 'log-1', name: 'Fixture lunch', get eaten_at() { return seededEatenAt() },
  foods: [{
    food_id: food.id, name: food.name, brand_name: null, image_url: null,
    glycemic_index: 52, glycemic_load: 12, nutrients,
    quantity: 1, serving: { id: '11', quantity: 1, unit: 'bowl', weight_grams: null },
  }],
}
const localToday = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
const waterLog = { id: 'water-1', amount: { value: 8, unit: 'fl_oz' }, get consumed_at() { return seededEatenAt() } }
const weightLog = { weight: { value: 150, unit: 'lb' }, get measured_at() { return seededEatenAt() } }
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

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1:18767')
  if (url.pathname === '/__reset') {
    rules.clear(); requests.length = 0; return json(response, {})
  }
  if (url.pathname === '/__control') {
    rules.set(url.searchParams.get('route'), {
      status: Number(url.searchParams.get('status') ?? 200),
      empty: url.searchParams.get('empty') === 'true',
      delay: Number(url.searchParams.get('delay') ?? 0),
    })
    return json(response, {})
  }
  if (url.pathname === '/__requests') return json(response, requests)

  requests.push({
    method: request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    authorization: Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0] ?? null
      : request.headers.authorization ?? null,
  })
  const rule = rules.get(url.pathname) ?? { status: 200, empty: false, delay: 0 }
  if (rule.delay) await new Promise((resolve) => setTimeout(resolve, rule.delay * 1000))
  if (rule.status !== 200) {
    const message = rule.status === 404
      ? 'No restaurant with id cafe. Use an id from a GET /v1.2/restaurants result.'
      : 'The test request could not be completed.'
    return json(response, { code: rule.status === 404 ? 'not_found' : 'fixture_error', message }, rule.status)
  }
  if (url.pathname === '/') return json(response, { ok: true })
  if (url.pathname === '/api/january/client-token' && request.method === 'POST') return json(response, {
    token: 'ct-fixture-token', expires_in: 1800, expires_at: new Date(Date.now() + 1_800_000).toISOString(),
    end_user_id: request.headers['january-end-user-id'], scopes: ['foods:read', 'restaurants:read'],
  })
  if (url.pathname === '/v1.2/foods/autocomplete') return json(response, { items: rule.empty ? [] : [{
    id: food.id, name: food.name, brand_name: null, image_url: null, nutrients,
  }] })
  if (url.pathname === '/v1.2/foods') return json(response, { items: rule.empty ? [] : [food] })
  if (url.pathname === '/v1.2/foods/barcode/012345678905') return json(response, food)
  if (url.pathname === '/v1.2/foods/food-1') return json(response, food)
  if (url.pathname === '/v1.2/food-analysis/text') return json(response, {
    meal_name: 'Fixture meal', total_nutrients: nutrients,
    detections: rule.empty ? [] : [{ confidence: 'high', food: {
      id: food.id, name: food.name, brand_name: null, nutrients, quantity: 1,
      serving: { id: servings[0].id, quantity: servings[0].quantity, unit: servings[0].unit },
    } }],
  })
  if (url.pathname === '/v1.2/food-analysis/image') return json(response, {
    meal_name: 'Fixture photo meal', total_nutrients: nutrients,
    detections: rule.empty ? [] : [{ confidence: 'high', food: {
      id: food.id, name: food.name, brand_name: null, nutrients, quantity: 1,
      serving: { id: servings[0].id, quantity: servings[0].quantity, unit: servings[0].unit },
    } }],
  })
  if (url.pathname === '/v1.2/glucose/predictions') return json(response, {
    impact_score: 'medium', chart: { min: 90, max: 140 },
    points: [{ minutes: 0, value: 95 }, { minutes: 45, value: 132 }, { minutes: 120, value: 98 }],
  })
  if (url.pathname === '/v1.2/food-logs/summary') {
    const day = url.searchParams.get('start_date')
    const logs = rule.empty ? 0 : 1
    const totals = { logs_count: logs, days_with_logs: logs, nutrients: logs ? nutrients : {} }
    return json(response, {
      group_by: 'day', week_start: null, timezone: url.searchParams.get('timezone'), start_date: day, end_date: url.searchParams.get('end_date'),
      buckets: [{ start_date: day, end_date: day, ...totals }], totals, average_per_logged_day: { nutrients: totals.nutrients },
    })
  }
  if (url.pathname === '/v1.2/food-logs' && request.method === 'GET') return json(response, {
    items: rule.empty ? [] : [foodLog],
  })
  if (url.pathname === '/v1.2/food-logs' && request.method === 'POST') return json(response, foodLog, 201)
  if (url.pathname === '/v1.2/food-logs/log-1' && request.method === 'PATCH') return json(response, foodLog)
  if (url.pathname === '/v1.2/food-logs/log-1' && request.method === 'DELETE') {
    response.writeHead(204); return response.end()
  }
  if (url.pathname === '/v1.2/water-logs' && request.method === 'POST') return json(response, waterLog, 201)
  if (url.pathname === '/v1.2/water-logs' && request.method === 'GET') {
    const unit = url.searchParams.get('unit') === 'ml' ? 'ml' : 'fl_oz'
    return json(response, { items: rule.empty ? [] : [{ date: url.searchParams.get('start_date') ?? localToday(), total: { value: unit === 'ml' ? 709.8 : 24, unit } }] })
  }
  if (url.pathname === '/v1.2/water-logs/water-1' && request.method === 'DELETE') {
    response.writeHead(204); return response.end()
  }
  if (url.pathname === '/v1.2/weight-logs' && request.method === 'POST') return json(response, weightLog, 201)
  if (url.pathname === '/v1.2/weight-logs' && request.method === 'GET') return json(response, {
    items: rule.empty ? [] : [{ date: url.searchParams.get('start_date') ?? localToday(), weight: { value: 150, unit: 'lb' } }],
  })
  if (url.pathname === '/v1.2/restaurants') return json(response, { items: rule.empty ? [] : [{
    type: 'restaurant', id: 'cafe', name: 'Fixture Cafe', is_chain: false,
    distance_meters: 100, city: 'San Francisco', address1: '123 Test Street', address2: null,
  }] })
  if (url.pathname === '/v1.2/restaurants/cafe/menu-items') return json(response, { items: rule.empty ? [] : directItems })
  if (url.pathname === '/v1.2/menu-items') return json(response, { items: rule.empty ? [] : searchItems })
  return json(response, { code: 'not_found', message: `Unmapped fixture route ${url.pathname}` }, 404)
}).listen(18767, '127.0.0.1')
