import { createServer } from 'node:http'

const rules = new Map()
const requests = []

const nutrients = { calories: { value: 100, unit: 'kcal' }, protein: { value: 4, unit: 'g' } }
const servings = [{ id: '11', quantity: 1, unit: 'bowl', scaling_factor: 1, weight_grams: null, is_primary: true }]
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
  if (url.pathname === '/v1.2/restaurants') return json(response, { items: rule.empty ? [] : [{
    type: 'restaurant', id: 'cafe', name: 'Fixture Cafe', is_chain: false,
    distance_meters: 100, city: 'San Francisco', address1: '123 Test Street', address2: null,
  }] })
  if (url.pathname === '/v1.2/restaurants/cafe/menu-items') return json(response, { items: rule.empty ? [] : directItems })
  if (url.pathname === '/v1.2/menu-items') return json(response, { items: rule.empty ? [] : searchItems })
  return json(response, { code: 'not_found', message: `Unmapped fixture route ${url.pathname}` }, 404)
}).listen(18767, '127.0.0.1')
