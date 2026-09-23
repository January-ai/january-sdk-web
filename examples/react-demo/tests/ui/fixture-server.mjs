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
const seededCreatedAt = () => {
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
  const anHourAgo = Date.now() - 60 * 60 * 1000
  return new Date(Math.max(anHourAgo, startOfToday.getTime() + 60 * 1000)).toISOString().replace(/\.\d{3}Z$/, 'Z')
}
const foodLog = {
  id: 'log-1', name: 'Fixture lunch', get created_at() { return seededCreatedAt() },
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
// Range history for the Tracking charts. A single-day request (start = end) keeps the fixed
// answer above; a longer range gets a year of generated days ending today, with gaps, and
// weights older than 45 days stored in kg so the demo has to convert them for display.
const shiftLocal = (day, days) => {
  const [year, month, date] = day.split('-').map(Number)
  const next = new Date(year, month - 1, date + days, 12)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}
const round1 = (value) => Math.round(value * 10) / 10
function historyDays(start, end) {
  const today = localToday()
  const days = []
  for (let offset = 0; offset <= 400; offset += 1) {
    const date = shiftLocal(today, -offset)
    if (date < start) break
    if (date <= end) days.unshift({ date, offset })
  }
  return days
}
// The API answers with at most the 100 most recent days that have logs.
const mostRecent = (items) => items.slice(-100)
function waterHistory(start, end, unit) {
  return mostRecent(historyDays(start, end)
    .filter(({ offset }) => offset === 0 || offset % 7 !== 4)
    .map(({ date, offset }) => {
      const flOz = offset === 0 ? 24 : 16 + ((offset * 37) % 5) * 8
      const value = { fl_oz: flOz, ml: round1(flOz * 29.5735295625), cup: flOz / 8 }[unit]
      return { date, total: { value, unit } }
    }))
}
function weightHistory(start, end) {
  return mostRecent(historyDays(start, end)
    .filter(({ offset }) => offset % 3 !== 2)
    .map(({ date, offset }) => {
      const pounds = offset === 0 ? 150 : round1(150 + offset * 0.02 + (((offset * 7) % 5) - 2) * 0.3)
      return { date, weight: offset >= 45 ? { value: round1(pounds * 0.45359237), unit: 'kg' } : { value: pounds, unit: 'lb' } }
    }))
}
const isRange = (url) => {
  const start = url.searchParams.get('start_date')
  const end = url.searchParams.get('end_date')
  return Boolean(start && end && start !== end)
}

// Suggested instead of Fixture Pizza; the first one opens as its own food.
const alternativeFood = {
  id: 'food-2', type: 'generic', name: 'Fixture Salad', brand_name: null,
  nutrients: { calories: { value: 60, unit: 'kcal' }, protein: { value: 2, unit: 'g' } },
  glycemic_index: 15, glycemic_load: 2, image_url: null, barcode: null,
  servings: [{ id: '21', quantity: 1, unit: 'plate', scaling_factor: 1, weight_grams: 150, is_primary: true }],
}
const alternatives = [
  { id: alternativeFood.id, name: alternativeFood.name, brand_name: null, nutrients: alternativeFood.nutrients,
    servings: [{ id: '21', quantity: 1, unit: 'plate', weight_grams: 150 }] },
  { id: 'food-3', name: 'Fixture Soup', brand_name: 'Fixture Kitchen', nutrients: { calories: { value: 80, unit: 'kcal' } },
    servings: [{ id: '31', quantity: 1, unit: 'cup', weight_grams: null }] },
]

const waterLog = { id: 'water-1', amount: { value: 8, unit: 'fl_oz' }, get created_at() { return seededCreatedAt() } }
const weightLog = { weight: { value: 150, unit: 'lb' }, get created_at() { return seededCreatedAt() } }
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

/** A request's JSON body, with long strings (a scanned image) shortened for the request log. */
async function readJson(request) {
  let source = ''
  for await (const chunk of request) source += chunk
  return source ? JSON.parse(source) : undefined
}
const shorten = (value) => JSON.parse(JSON.stringify(value ?? null, (_, item) => typeof item === 'string' && item.length > 200 ? `${item.slice(0, 40)}…` : item))

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
      code: url.searchParams.get('code'),
      message: url.searchParams.get('message'),
      // Only requests with this query value answer with the status, e.g. unit=cup.
      when: url.searchParams.get('when'),
    })
    return json(response, {})
  }
  if (url.pathname === '/__requests') return json(response, requests)

  const body = request.method === 'POST' || request.method === 'PATCH' ? await readJson(request) : undefined
  requests.push({
    method: request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    body: shorten(body),
    authorization: Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0] ?? null
      : request.headers.authorization ?? null,
    endUserId: request.headers['january-end-user-id'] ?? null,
  })
  const rule = rules.get(url.pathname) ?? { status: 200, empty: false, delay: 0 }
  if (rule.delay) await new Promise((resolve) => setTimeout(resolve, rule.delay * 1000))
  const [whenKey, whenValue] = rule.when ? rule.when.split('=') : []
  const applies = !rule.when || url.searchParams.get(whenKey) === whenValue || body?.[whenKey] === whenValue || body?.amount?.[whenKey] === whenValue
  if (rule.status !== 200 && applies) {
    const message = rule.message ?? (rule.status === 404
      ? 'No restaurant with id cafe. Use an id from a GET /v1.2/restaurants result.'
      : 'The test request could not be completed.')
    return json(response, { code: rule.code ?? (rule.status === 404 ? 'not_found' : 'fixture_error'), message }, rule.status)
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
  // Any other UPC is not in the catalog, as the API answers it.
  if (url.pathname.startsWith('/v1.2/foods/barcode/')) return json(response, {
    code: 'not_found', message: `No food found for barcode ${url.pathname.split('/').pop()}.`,
  }, 404)
  if (url.pathname === '/v1.2/foods/food-1') return json(response, food)
  if (url.pathname === '/v1.2/foods/food-2') return json(response, alternativeFood)
  // A food with calories and protein only, so its detail has no further nutrition facts.
  if (url.pathname === '/v1.2/foods/food-3') return json(response, {
    ...alternativeFood, id: 'food-3', name: 'Fixture Soup', brand_name: 'Fixture Kitchen', glycemic_index: null, glycemic_load: null,
    servings: [{ id: '31', quantity: 1, unit: 'cup', scaling_factor: 1, weight_grams: null, is_primary: true }],
  })
  if (url.pathname === '/v1.2/foods/food-1/alternatives' && request.method === 'POST') {
    return json(response, { alternatives: rule.empty ? [] : alternatives })
  }
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
  if (url.pathname === '/v1.2/food-analysis/corrections' && request.method === 'POST') {
    // Answers with the corrected meal: the scan it was sent, renamed, and twice the quantity.
    const detections = (body?.analysis?.detections ?? []).map((detection) => ({
      ...detection, food: { ...detection.food, quantity: (detection.food.quantity ?? 1) * 2 },
    }))
    return json(response, {
      meal_name: `Corrected ${body?.analysis?.meal_name ?? 'meal'}`,
      total_nutrients: { calories: { value: 200, unit: 'kcal' }, protein: { value: 8, unit: 'g' } },
      detections,
    })
  }
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
  if (url.pathname === '/v1.2/water-logs' && request.method === 'POST') {
    return json(response, { ...waterLog, amount: body?.amount ?? waterLog.amount, created_at: body?.created_at ?? waterLog.created_at }, 201)
  }
  if (url.pathname === '/v1.2/water-logs' && request.method === 'GET') {
    const requested = url.searchParams.get('unit')
    const unit = requested === 'ml' || requested === 'cup' ? requested : 'fl_oz'
    // The seeded day holds 24 fl oz: 709.8 ml, or 3 US cups of 8 fl oz (236.588 ml each).
    const value = { fl_oz: 24, ml: 709.8, cup: 3 }[unit]
    if (isRange(url)) return json(response, { items: rule.empty ? [] : waterHistory(url.searchParams.get('start_date'), url.searchParams.get('end_date'), unit) })
    return json(response, { items: rule.empty ? [] : [{ date: url.searchParams.get('start_date') ?? localToday(), total: { value, unit } }] })
  }
  if (url.pathname === '/v1.2/water-logs/water-1' && request.method === 'DELETE') {
    response.writeHead(204); return response.end()
  }
  if (url.pathname === '/v1.2/weight-logs' && request.method === 'POST') {
    return json(response, { weight: body?.weight ?? weightLog.weight, created_at: body?.created_at ?? weightLog.created_at }, 201)
  }
  if (url.pathname === '/v1.2/weight-logs' && request.method === 'GET' && isRange(url)) return json(response, {
    items: rule.empty ? [] : weightHistory(url.searchParams.get('start_date'), url.searchParams.get('end_date')),
  })
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
