import { expect, test, type Locator, type Page } from '@playwright/test'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { byId, freshRateWindow, observed, openDemo, rateWindowEnds, shown, step, verified } from './evidence'
import {
  allowanceUsedUp, api, cleanup, endUserId, evidenceDir, foodLog, foodLogs, foodLogSummary, localDay,
  rememberCreated, rememberDeleted, setLogContext, timezone, waterTotal, waterTotals, weightOn, weights,
} from './live-api.mjs'

// The demo against the real January API through the token relay, as LIVE_END_USER_ID.
// After each change made in the demo, the same data is read back from the API directly.
// Water and food logs created here are deleted by the end; the API cannot delete weight logs.

const runFile = join(evidenceDir, 'run.json')
const run: { id: string; startedAt: string; baseline?: unknown } = existsSync(runFile)
  ? JSON.parse(readFileSync(runFile, 'utf8'))
  : { id: Date.now().toString(36), startedAt: new Date().toISOString() }
writeFileSync(runFile, `${JSON.stringify(run, null, 2)}\n`)

const today = localDay()
const yesterday = localDay(-1)
const lunch = `QA web lunch ${run.id}`
const snack = `QA web snack ${run.id}`
const sf = { latitude: 37.7749, longitude: -122.4194 }

const text = async (page: Page, id: string) => (await byId(page, id).textContent())?.trim() ?? ''
const query = (values: Record<string, string | number>) => new URLSearchParams(Object.entries(values).map(([key, value]) => [key, String(value)])).toString()

/** When a meal was eaten (its `created_at`), as the demo shows it on the browser's clock. */
const mealTime = (iso: string) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
// Newer ICU puts a narrow no-break space before AM and PM.
const squash = (value: string | null) => (value ?? '').replace(/\s+/g, ' ')
const expectMealTime = (row: Locator, createdAt: string) => expect.poll(async () => squash(await row.textContent())).toContain(squash(mealTime(createdAt)))
/** A `datetime-local` value earlier today: 90 minutes ago, or midnight when that was yesterday. */
function earlierToday() {
  const midnight = new Date()
  midnight.setHours(0, 0, 0, 0)
  const at = new Date(Math.max(Date.now() - 90 * 60_000, midnight.getTime()))
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${localDay(0, at)}T${pad(at.getHours())}:${pad(at.getMinutes())}`
}

test.describe('Live demo @live', () => {
  test.use({ viewport: { width: 1440, height: 1000 } })
  test.beforeEach(async ({ page }) => {
    const usedUp = allowanceUsedUp()
    test.skip(Boolean(usedUp), `The account's API allowance is used up: ${usedUp?.message}`)
    await freshRateWindow(page)
  })
  test.afterEach(() => rateWindowEnds())

  test('Baseline: the QA user as the API holds it @catalog @logs', async ({ page }) => {
    // Water only: cleanup puts it back. Each flow reads the rest for itself before changing it.
    await step(page, 'Baseline', 'Read the QA user\'s water for today and yesterday', async () => {
      if (!run.baseline) {
        run.baseline = {
          today: { water: { fl_oz: await waterTotal(today, 'fl_oz') } },
          yesterday: { water: { fl_oz: await waterTotal(yesterday, 'fl_oz') } },
        }
        writeFileSync(runFile, `${JSON.stringify(run, null, 2)}\n`)
      }
      observed('Baseline before any change', run.baseline)
    })
  })

  test('Relay token and the active user @catalog', async ({ page }) => {
    const card = () => byId(page, 'configuration-card').filter({ visible: true })
    await step(page, 'Relay token', 'The demo runs in client-token mode with the relay online', async () => {
      await openDemo(page, '/search')
      await expect(card()).toContainText('Client token exchange (ct-…)')
      await expect(card().getByTestId('relay-status')).toHaveText('Online')
    }, card)
    await step(page, 'Relay token', 'Mint a fresh client token through the relay', async () => {
      await card().getByTestId('token-mint').click()
      await expect(card().getByTestId('token-status')).toContainText('Token ready')
      observed('Token status in the demo', await card().getByTestId('token-status').textContent())
    }, card)
    await step(page, 'Active user', 'Every log is scoped to the QA user and this timezone', async () => {
      await openDemo(page, '/food-logs')
      await expect(byId(page, 'settings-user-id')).toHaveText(`${endUserId} · ${timezone}`)
      verified('Active user', await text(page, 'settings-user-id'), { endUserId, timezone })
    })
  })

  test('Search: autocomplete, name, category, and barcode @catalog', async ({ page }) => {
    await step(page, 'Search', 'Autocomplete suggests foods while typing', async () => {
      await openDemo(page, '/search')
      await byId(page, 'search-input').fill('banan')
      await expect(byId(page, 'autocomplete-suggestions')).toBeVisible()
      const server = await api('GET', `/v1.2/foods/autocomplete?${query({ query: 'banan', limit: 8 })}`)
      await expect(byId(page, 'autocomplete-result-0')).toContainText(server.body.items[0].name)
      verified('First suggestion for "banan"', await text(page, 'autocomplete-result-0'), server.body.items[0].name)
    })
    await step(page, 'Search', 'Search "banana" by name', async () => {
      await byId(page, 'search-input').fill('banana')
      await byId(page, 'search-submit').click()
      await expect(byId(page, 'search-results')).toBeVisible()
      const server = await api('GET', `/v1.2/foods?${query({ query: 'banana', limit: 20 })}`)
      await expect(page.getByText(`${server.body.items.length} found`)).toBeVisible()
      await expect(byId(page, 'food-result-0')).toContainText(server.body.items[0].name)
      verified('Results and first result', { count: await page.getByTestId(/^food-result-\d+$/).count(), first: await text(page, 'food-result-0') }, { count: server.body.items.length, first: server.body.items[0].name })
    })
    await step(page, 'Search', 'Branded category narrows the search', async () => {
      await byId(page, 'category-branded').click()
      await byId(page, 'search-submit').click()
      const server = await api('GET', `/v1.2/foods?${query({ query: 'banana', type: 'branded', limit: 20 })}`)
      await expect(byId(page, 'food-result-0')).toContainText(server.body.items[0].name)
      verified('First branded result', await text(page, 'food-result-0'), server.body.items[0].name)
      await byId(page, 'category-all').click()
    })
    await step(page, 'Search', 'Barcode mode finds a UPC', async () => {
      await byId(page, 'search-mode-barcode').click()
      await byId(page, 'search-input').fill('012000161155')
      await byId(page, 'search-submit').click()
      const server = await api('GET', '/v1.2/foods/barcode/012000161155')
      await expect(byId(page, 'food-result-0')).toContainText(server.body.name)
      verified('UPC 012000161155', await text(page, 'food-result-0'), server.body.name)
    })
    await step(page, 'Search', 'An unknown UPC is no match, not an error', async () => {
      await byId(page, 'search-input').fill('000000000000')
      await byId(page, 'search-submit').click()
      await expect(byId(page, 'empty-results')).toBeVisible()
      await expect(byId(page, 'search-error')).toHaveCount(0)
      const server = await api('GET', '/v1.2/foods/barcode/000000000000')
      expect(server.status).toBe(404)
      verified('Unknown UPC', await text(page, 'empty-results'), { status: server.status, code: server.body.code })
    })
  })

  test('Food detail, glucose, and alternatives @catalog', async ({ page }) => {
    let foodId = ''
    await step(page, 'Food detail', 'Open banana from search', async () => {
      await openDemo(page, '/search?q=banana')
      await byId(page, 'food-result-0').click()
      await expect(byId(page, 'food-detail-screen')).toBeVisible()
      await expect(byId(page, 'food-macros')).toBeVisible()
      foodId = decodeURIComponent(new URL(page.url()).pathname.split('/').pop()!)
      const server = await api('GET', `/v1.2/foods/${foodId}`)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(server.body.name)
      const primary = server.body.servings.find((serving: { is_primary: boolean }) => serving.is_primary) ?? server.body.servings[0]
      const calories = server.body.nutrients.calories.value * primary.scaling_factor
      await expect(byId(page, 'food-macros')).toContainText(`${shown(calories)} cal`)
      await expect(byId(page, 'food-serving-unit')).toHaveValue(primary.id)
      verified('Calories for the primary serving', (await text(page, 'food-macros')).split('cal')[0], { calories, serving: primary.unit })
    }, () => byId(page, 'food-macros'))
    await step(page, 'Food detail', 'Change the quantity', async () => {
      await byId(page, 'food-serving-controls').getByRole('button', { name: 'Increase quantity' }).click()
      await expect(byId(page, 'food-serving-controls')).toContainText('1.25')
    }, () => byId(page, 'food-serving-controls'))
    await step(page, 'Glucose (food detail)', 'Check the glucose response for 1.25 servings', async () => {
      await byId(page, 'food-check-glucose').click()
      await expect(byId(page, 'food-glucose-result')).toBeVisible()
      const peakText = (await byId(page, 'food-glucose-result').locator('.data-number').first().textContent())!.trim()
      const serving = await byId(page, 'food-serving-unit').inputValue()
      const server = await api('POST', '/v1.2/glucose/predictions', {
        user_profile: { age: 42, sex: 'female', height: { value: 66, unit: 'in' }, weight: { value: 150, unit: 'lb' }, activity_level: 'moderately_active', health_conditions: [] },
        foods: [{ food_id: foodId, serving_id: serving, quantity: 1.25 }],
        start_time: new Date().toISOString(),
        timezone,
      })
      const peak = Math.max(...server.body.points.map((point: { value: number }) => point.value))
      expect(Math.abs(Number(peakText) - peak)).toBeLessThanOrEqual(5)
      verified('Likely peak (mg/dL; the API varies slightly with start time)', Number(peakText), Math.round(peak))
    }, () => byId(page, 'food-glucose-result'))
    await step(page, 'Alternatives', 'Vegan alternatives to banana', async () => {
      await byId(page, 'food-alternatives').click()
      await byId(page, 'diet-preference-vegan').click()
      await byId(page, 'alternatives-refresh').click()
      await expect(byId(page, 'alternatives-results').or(byId(page, 'alternatives-empty'))).toBeVisible()
      const server = await api('POST', `/v1.2/foods/${foodId}/alternatives`, { diet_restrictions: [], diet_preferences: ['vegan'] })
      const shownNames = await page.getByTestId(/^alternative-\d+$/).allTextContents()
      verified('Vegan alternatives', shownNames.length, server.body.alternatives.map((item: { name: string }) => item.name))
      expect(shownNames.length).toBeGreaterThan(0)
      expect(server.body.alternatives.length).toBeGreaterThan(0)
    }, () => byId(page, 'alternatives-panel'))
    await step(page, 'Alternatives', 'Gluten-free and high-protein alternatives', async () => {
      await byId(page, 'diet-preference-vegan').click()
      await byId(page, 'diet-restriction-gluten').click()
      await byId(page, 'diet-preference-high_protein').click()
      await byId(page, 'alternatives-refresh').click()
      await expect(byId(page, 'alternatives-loading')).toHaveCount(0)
      await expect(byId(page, 'alternatives-results').or(byId(page, 'alternatives-empty')).or(byId(page, 'alternatives-error'))).toBeVisible()
      await expect(byId(page, 'alternatives-error')).toHaveCount(0)
      observed('Alternatives shown', await page.getByTestId(/^alternative-\d+$/).allTextContents())
    }, () => byId(page, 'alternatives-panel'))
    await step(page, 'Alternatives', 'Open a suggested alternative', async () => {
      const first = page.getByTestId(/^alternative-\d+$/).first()
      const name = (await first.locator('.font-bold').first().textContent())!.trim()
      await first.click()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
      const openedId = decodeURIComponent(new URL(page.url()).pathname.split('/').pop()!)
      const server = await api('GET', `/v1.2/foods/${openedId}`)
      await expect(byId(page, 'food-serving-unit')).toHaveValue((server.body.servings.find((serving: { is_primary: boolean }) => serving.is_primary) ?? server.body.servings[0]).id)
      verified('Opened alternative', name, server.body.name)
    })
  })

  test('Restaurants and menus @catalog', async ({ page, context }) => {
    let restaurant: { id: string; name: string } = { id: '', name: '' }
    await step(page, 'Restaurants', 'Search "pizza" near San Francisco', async () => {
      await openDemo(page, '/search')
      await byId(page, 'search-scope-restaurants').click()
      await byId(page, 'restaurant-search-input').fill('pizza')
      await byId(page, 'restaurant-search-submit').click()
      await expect(byId(page, 'restaurant-results')).toBeVisible()
      const server = await api('GET', `/v1.2/restaurants?${query({ query: 'pizza', ...sf, radius_meters: 8000, limit: 20 })}`)
      restaurant = server.body.items[0]
      await expect(byId(page, 'restaurant-result-0')).toContainText(restaurant.name)
      const miles = server.body.items[0].distance_meters / 1609.344
      await expect(byId(page, 'restaurant-result-0')).toContainText(`${miles.toFixed(miles < 10 ? 1 : 0)} mi`)
      verified('Restaurants and first result', { count: await page.getByTestId(/^restaurant-result-\d+$/).count(), first: await text(page, 'restaurant-result-0') }, { count: server.body.items.length, first: restaurant.name, distanceMeters: server.body.items[0].distance_meters })
      expect(await page.getByTestId(/^restaurant-result-\d+$/).count()).toBe(server.body.items.length)
    })
    await step(page, 'Restaurants', 'Open the first restaurant\'s menu', async () => {
      await byId(page, 'restaurant-result-0').click()
      await expect(byId(page, 'restaurant-detail-screen')).toContainText(restaurant.name)
      await expect(byId(page, 'menu-results')).toBeVisible()
      const direct = await api('GET', `/v1.2/restaurants/${restaurant.id}/menu-items?${query({ limit: 100, offset: 0 })}`)
      let expected: number
      if (direct.status === 404) {
        // The demo then searches menu items by the restaurant's name, as it documents.
        const normalize = (value: string) => value.split('(', 1)[0]!.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
        const search = await api('GET', `/v1.2/menu-items?${query({ query: restaurant.name, ...sf, radius_meters: 8000, limit: 20 })}`)
        expected = search.body.items.filter((item: { restaurant_name?: string }) => item.restaurant_name && normalize(item.restaurant_name) === normalize(restaurant.name)).length
        observed('Menu by restaurant ID', { status: direct.status, fallback: 'menu-item search by name', matching: expected })
      } else {
        expected = direct.body.items.length
      }
      const rows = await page.getByTestId(/^restaurant-menu-item-\d+$/).count()
      if (expected === 0) await expect(byId(page, 'menu-empty')).toBeVisible()
      expect(rows).toBe(expected)
      verified('Menu items shown', rows, expected)
    }, () => byId(page, 'restaurant-detail-screen'))
    await step(page, 'Restaurants', 'Search from the current location (New York)', async () => {
      await context.grantPermissions(['geolocation'])
      await context.setGeolocation({ latitude: 40.7128, longitude: -74.006 })
      await byId(page, 'location-current').click()
      await expect(byId(page, 'location-city')).toHaveValue('current')
      await byId(page, 'restaurant-search-input').fill('bagels')
      await byId(page, 'restaurant-search-submit').click()
      await expect(byId(page, 'restaurant-results').or(byId(page, 'restaurants-empty'))).toBeVisible()
      const server = await api('GET', `/v1.2/restaurants?${query({ query: 'bagels', latitude: 40.7128, longitude: -74.006, radius_meters: 8000, limit: 20 })}`)
      if (server.body.items.length) await expect(byId(page, 'restaurant-result-0')).toContainText(server.body.items[0].name)
      verified('Restaurants near New York', await page.getByTestId(/^restaurant-result-\d+$/).count(), server.body.items.length)
    })
  })

  test('Photo scan of the sample meal, correction, and meal glucose @catalog', async ({ page }) => {
    let before: string[] = []
    await step(page, 'Photo scan', 'Analyze the sample meal photo', async () => {
      await openDemo(page, '/scan')
      await byId(page, 'scan-sample').click()
      await expect(byId(page, 'scan-preview')).toBeVisible()
      await byId(page, 'scan-analyze').click()
      await expect(byId(page, 'scan-results')).toBeVisible({ timeout: 120_000 })
      before = await page.getByTestId(/^scan-detection-\d+$/).allTextContents()
      expect(before.length).toBeGreaterThan(0)
      observed('Detected foods', before)
    }, () => byId(page, 'scan-results'))
    await step(page, 'Photo scan', 'Correct it: there were no fries', async () => {
      await byId(page, 'scan-correct').click()
      await byId(page, 'scan-correction-input').fill('There were no fries on the plate, only the burger.')
      await byId(page, 'scan-correction-submit').click()
      await expect(byId(page, 'scan-corrected')).toBeVisible({ timeout: 120_000 })
      const after = await page.getByTestId(/^scan-detection-\d+$/).allTextContents()
      observed('Detected foods after the correction', { before, after })
      expect(before.some((name) => /fries/i.test(name))).toBe(true)
      expect(after.some((name) => /fries/i.test(name))).toBe(false)
    }, () => byId(page, 'scan-results'))
    await step(page, 'Photo scan', 'Predict the corrected meal\'s glucose response', async () => {
      await byId(page, 'scan-glucose-predict').click()
      await expect(byId(page, 'scan-glucose-result')).toBeVisible()
      observed('Meal glucose', await byId(page, 'scan-glucose-result').locator('.data-number').first().textContent())
    }, () => byId(page, 'scan-glucose-result'))
    await step(page, 'Photo scan', 'Analyze another meal', async () => {
      await byId(page, 'scan-another').click()
      await expect(byId(page, 'scan-guide')).toBeVisible()
    })
  })

  test('Description scan and correction @catalog', async ({ page }) => {
    const description = 'two scrambled eggs and a slice of toast'
    await step(page, 'Description scan', `Analyze "${description}"`, async () => {
      await openDemo(page, '/scan')
      await byId(page, 'scan-mode-description').click()
      await byId(page, 'description-input').fill(description)
      await byId(page, 'description-submit').click()
      await expect(byId(page, 'description-results')).toBeVisible({ timeout: 120_000 })
      const shownFoods = await page.getByTestId(/^scan-detection-\d+$/).allTextContents()
      const server = await api('POST', '/v1.2/food-analysis/text', { text: description })
      verified('Detected foods (the API is asked the same question directly)', shownFoods, server.body.detections.map((item: { food: { name: string; quantity: number } }) => `${item.food.quantity} × ${item.food.name}`))
      expect(shownFoods.some((name) => /egg/i.test(name))).toBe(true)
      expect(shownFoods.some((name) => /toast|bread/i.test(name))).toBe(true)
    }, () => byId(page, 'description-results'))
    await step(page, 'Description scan', 'Correct it: no toast, three eggs', async () => {
      await byId(page, 'scan-correct').click()
      await byId(page, 'scan-correction-input').fill('There was no toast, and it was three eggs.')
      await byId(page, 'scan-correction-submit').click()
      await expect(byId(page, 'scan-corrected')).toBeVisible({ timeout: 120_000 })
      const after = await page.getByTestId(/^scan-detection-\d+$/).allTextContents()
      observed('Detected foods after the correction', after)
      expect(after.some((name) => /toast|bread/i.test(name))).toBe(false)
      expect(after.find((name) => /egg/i.test(name))).toMatch(/^[^×]*egg[^×]*3 ×/i)
    }, () => byId(page, 'description-results'))
  })

  test('UPC lookup and a scan from an image URL @catalog', async ({ page }) => {
    await step(page, 'UPC lookup', 'Look up UPC 012000161155 and open it', async () => {
      await openDemo(page, '/scan')
      await byId(page, 'scan-mode-barcode').click()
      await byId(page, 'barcode-input').fill('012000161155')
      await byId(page, 'barcode-submit').click()
      const server = await api('GET', '/v1.2/foods/barcode/012000161155')
      await expect(byId(page, 'food-result-0')).toContainText(server.body.name)
      await byId(page, 'food-result-0').click()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(server.body.name)
      verified('UPC 012000161155', await page.getByRole('heading', { level: 1 }).textContent(), server.body.name)
      await byId(page, 'food-detail-back').click()
      await expect(byId(page, 'scan-screen')).toBeVisible()
    })
    await step(page, 'UPC lookup', 'An unknown UPC shows no match', async () => {
      await byId(page, 'scan-mode-barcode').click()
      await byId(page, 'barcode-input').fill('000000000000')
      await byId(page, 'barcode-submit').click()
      await expect(byId(page, 'empty-results')).toContainText('No match found')
      await expect(byId(page, 'search-error')).toHaveCount(0)
    })
    await step(page, 'Photo scan (URL)', 'Analyze a public image URL', async () => {
      const server = await api('GET', `/v1.2/foods?${query({ query: 'banana', limit: 20 })}`)
      const imageUrl = server.body.items.find((item: { image_url: string | null }) => item.image_url)?.image_url
      expect(imageUrl).toBeTruthy()
      await byId(page, 'scan-mode-photo').click()
      await byId(page, 'image-url-input').fill(imageUrl)
      await byId(page, 'image-url-use').click()
      await expect(byId(page, 'scan-preview')).toHaveAttribute('src', imageUrl)
      await byId(page, 'scan-analyze').click()
      await expect(byId(page, 'scan-results').or(byId(page, 'scan-error'))).toBeVisible({ timeout: 120_000 })
      await expect(byId(page, 'scan-error')).toHaveCount(0)
      observed('Detected foods from the image URL', { imageUrl, foods: await page.getByTestId(/^scan-detection-\d+$/).allTextContents() })
    }, () => byId(page, 'scan-results'))
  })

  test('Glucose prediction @catalog', async ({ page }) => {
    await step(page, 'Glucose', 'Choose apple and a profile', async () => {
      await openDemo(page, '/glucose')
      await byId(page, 'glucose-sex').selectOption('male')
      await byId(page, 'glucose-activity').selectOption('lightly_active')
      await byId(page, 'glucose-age').fill('51')
      await byId(page, 'food-picker-input').fill('apple')
      await byId(page, 'glucose-add-food').click()
      await byId(page, 'food-picker-result-0').click()
      await expect(byId(page, 'glucose-food-0')).toContainText(/apple/i)
    })
    await step(page, 'Glucose', 'Predict the response and compare with the API', async () => {
      await byId(page, 'glucose-predict').click()
      await expect(byId(page, 'glucose-result')).toBeVisible()
      const peakText = (await byId(page, 'glucose-result').locator('.data-number').first().textContent())!.trim()
      const search = await api('GET', `/v1.2/foods?${query({ query: 'apple', limit: 20 })}`)
      const food = (await api('GET', `/v1.2/foods/${search.body.items[0].id}`)).body
      const serving = food.servings.find((item: { is_primary: boolean }) => item.is_primary) ?? food.servings[0]
      const server = await api('POST', '/v1.2/glucose/predictions', {
        user_profile: { age: 51, sex: 'male', height: { value: 66, unit: 'in' }, weight: { value: 150, unit: 'lb' }, activity_level: 'lightly_active', health_conditions: [] },
        foods: [{ food_id: food.id, serving_id: serving.id, quantity: 1 }],
        start_time: new Date().toISOString(),
        timezone,
      })
      const peak = Math.max(...server.body.points.map((point: { value: number }) => point.value))
      verified('Likely peak (mg/dL)', Number(peakText), Math.round(peak))
      expect(Math.abs(Number(peakText) - peak)).toBeLessThanOrEqual(5)
    }, () => byId(page, 'glucose-result'))
  })

  // The @logs flows run in order of what they prove, then clean up, so that when the allowance
  // runs short the flows that are skipped are the least important ones, and the day picker,
  // which only reads, comes last.

  test('Water in fl oz and ml, delete the last entry, and an earlier day @logs', async ({ page }) => {
    let flOz = 0
    let ml = 0
    let lastId = ''
    const remember = async (note: string) => {
      lastId = (await byId(page, 'water-log-last').getAttribute('data-log-id'))!
      rememberCreated('water', lastId, note)
    }
    await step(page, 'Water', 'The day total matches the API before logging', async () => {
      await openDemo(page, '/tracking')
      flOz = await waterTotal(today, 'fl_oz')
      if (flOz) await expect(byId(page, 'water-day-total')).toHaveText(`${shown(flOz)} fl oz`)
      else await expect(byId(page, 'water-logs-empty')).toBeVisible()
      verified('Water today before logging', flOz ? await text(page, 'water-day-total') : await text(page, 'water-logs-empty'), { fl_oz: flOz })
    }, () => byId(page, 'water-section'))
    await step(page, 'Water', 'Log 8 fl oz', async () => {
      await byId(page, 'water-unit-fl-oz').click()
      await byId(page, 'water-amount').fill('8')
      await byId(page, 'water-log-add').click()
      await expect(byId(page, 'water-log-last')).toContainText('Logged 8 fl oz at')
      await remember('8 fl oz today')
      await expect(byId(page, 'water-day-total')).toHaveText(`${shown(flOz + 8)} fl oz`)
      const server = await waterTotal(today, 'fl_oz')
      expect(server).toBeCloseTo(flOz + 8, 1)
      flOz = server
      verified('Water today after 8 fl oz', await text(page, 'water-day-total'), { fl_oz: server })
    }, () => byId(page, 'water-section'))
    await step(page, 'Water', 'The same total in ml', async () => {
      await byId(page, 'water-unit-ml').click()
      ml = await waterTotal(today, 'ml')
      expect(ml).toBeCloseTo(flOz * 29.5735, 0)
      await expect(byId(page, 'water-day-total')).toHaveText(`${shown(ml)} ml`)
      verified('Water today in ml', await text(page, 'water-day-total'), { ml })
    }, () => byId(page, 'water-section'))
    await step(page, 'Water', 'Log 250 ml', async () => {
      await byId(page, 'water-amount').fill('250')
      await byId(page, 'water-log-add').click()
      await expect(byId(page, 'water-log-last')).toContainText('Logged 250 ml at')
      await remember('250 ml today')
      const server = await waterTotal(today, 'ml')
      expect(server).toBeCloseTo(ml + 250, 0)
      await expect(byId(page, 'water-day-total')).toHaveText(`${shown(server)} ml`)
      verified('Water today after 250 ml', await text(page, 'water-day-total'), { ml: server })
    }, () => byId(page, 'water-section'))
    await step(page, 'Water', 'Delete the last entry (250 ml)', async () => {
      await byId(page, 'water-log-delete').click()
      await expect(byId(page, 'water-log-last')).toHaveCount(0)
      await expect(byId(page, 'water-day-total')).toHaveText(`${shown(ml)} ml`)
      const server = await waterTotal(today, 'ml')
      expect(server).toBeCloseTo(ml, 1)
      rememberDeleted('water', lastId, 'deleted in the demo')
      verified('Water today after deleting 250 ml', await text(page, 'water-day-total'), { ml: server })
    }, () => byId(page, 'water-section'))
    await step(page, 'Water', 'Log 350 ml on yesterday, then delete it', async () => {
      await byId(page, 'logs-day-previous').click()
      await expect(byId(page, 'logs-day-label')).toHaveText('Yesterday')
      const before = await waterTotal(yesterday, 'ml')
      await byId(page, 'water-amount').fill('350')
      await byId(page, 'water-log-add').click()
      // An earlier day is stamped at noon on the end user's clock, so it lands on that day.
      await expect(byId(page, 'water-log-last')).toContainText(/Logged 350 ml on .+ at 12:00\sPM/)
      await remember('350 ml yesterday')
      await expect(byId(page, 'water-day-total')).toHaveText(`${shown(before + 350)} ml`)
      const onYesterday = await waterTotal(yesterday, 'ml')
      const onToday = await waterTotal(today, 'ml')
      expect(onYesterday).toBeCloseTo(before + 350, 0)
      expect(onToday).toBeCloseTo(ml, 1)
      verified('Logged while viewing yesterday lands on yesterday', { total: await text(page, 'water-day-total'), entry: await text(page, 'water-log-last') }, { yesterday: onYesterday, today: onToday })
      await byId(page, 'water-log-delete').click()
      await expect(byId(page, 'water-log-last')).toHaveCount(0)
      if (before) await expect(byId(page, 'water-day-total')).toHaveText(`${shown(before)} ml`)
      else await expect(byId(page, 'water-logs-empty')).toBeVisible()
      const after = await waterTotal(yesterday, 'ml')
      expect(after).toBeCloseTo(before, 1)
      rememberDeleted('water', lastId, 'deleted in the demo')
      verified('Yesterday after deleting the 350 ml', before ? await text(page, 'water-day-total') : await text(page, 'water-logs-empty'), { ml: after })
    }, () => byId(page, 'water-section'))
  })

  test('Water in cups, down to 0.1 cup: log, and delete the last entry @logs', async ({ page }) => {
    let cups = 0
    let lastId = ''
    await step(page, 'Water (cup)', 'The day total in cups matches the API', async () => {
      await openDemo(page, '/tracking')
      await byId(page, 'water-unit-cup').click()
      cups = await waterTotal(today, 'cup')
      if (cups) await expect(byId(page, 'water-day-total')).toHaveText(`${shown(cups)} cup`)
      else await expect(byId(page, 'water-logs-empty')).toBeVisible()
      await expect(byId(page, 'water-logs-error')).toHaveCount(0)
      await expect(byId(page, 'water-chart').or(byId(page, 'water-chart-empty'))).toBeVisible()
      await expect(byId(page, 'water-chart-error')).toHaveCount(0)
      if (await byId(page, 'water-chart').count()) await expect(byId(page, 'water-chart')).toHaveAttribute('data-unit', 'cup')
      verified('Water today in cups', cups ? await text(page, 'water-day-total') : await text(page, 'water-logs-empty'), { cup: cups })
    }, () => byId(page, 'water-section'))
    await step(page, 'Water (cup)', 'Log 1 cup: 8 fl oz more', async () => {
      await byId(page, 'water-amount').fill('1')
      await byId(page, 'water-log-add').click()
      await expect(byId(page, 'water-log-last')).toContainText('Logged 1 cup at')
      rememberCreated('water', (await byId(page, 'water-log-last').getAttribute('data-log-id'))!, '1 cup today')
      const server = { cup: await waterTotal(today, 'cup'), fl_oz: await waterTotal(today, 'fl_oz') }
      expect(server.cup).toBeCloseTo(cups + 1, 1)
      expect(server.fl_oz).toBeCloseTo(server.cup * 8, 0)
      await expect(byId(page, 'water-day-total')).toHaveText(`${shown(server.cup)} cup`)
      cups = server.cup
      verified('Water today after 1 cup', await text(page, 'water-day-total'), server)
    }, () => byId(page, 'water-section'))
    await step(page, 'Water (cup)', 'Log 0.1 cup, the smallest amount the API accepts', async () => {
      await byId(page, 'water-amount').fill('0.1')
      await byId(page, 'water-log-add').click()
      await expect(byId(page, 'water-log-add-error')).toHaveCount(0)
      await expect(byId(page, 'water-log-last')).toContainText('Logged 0.1 cup at')
      lastId = (await byId(page, 'water-log-last').getAttribute('data-log-id'))!
      rememberCreated('water', lastId, '0.1 cup today')
      const server = await waterTotal(today, 'cup')
      expect(server).toBeCloseTo(cups + 0.1, 1)
      await expect(byId(page, 'water-day-total')).toHaveText(`${shown(server)} cup`)
      verified('Water today after 0.1 cup', { total: await text(page, 'water-day-total'), entry: await text(page, 'water-log-last') }, { cup: server })
    }, () => byId(page, 'water-section'))
    await step(page, 'Water (cup)', 'Delete the last entry (0.1 cup)', async () => {
      await byId(page, 'water-log-delete').click()
      await expect(byId(page, 'water-log-last')).toHaveCount(0)
      await expect(byId(page, 'water-day-total')).toHaveText(`${shown(cups)} cup`)
      const server = await waterTotal(today, 'cup')
      expect(server).toBeCloseTo(cups, 1)
      rememberDeleted('water', lastId, 'deleted in the demo')
      verified('Water today after deleting 0.1 cup', await text(page, 'water-day-total'), { cup: server })
    }, () => byId(page, 'water-section'))
  })

  test('Weight in lb and kg, and the week, month, and year charts @logs', async ({ page }) => {
    await step(page, 'Weight', 'The day value matches the API before logging', async () => {
      await openDemo(page, '/tracking')
      const server = await weightOn(today)
      if (server) await expect(byId(page, 'weight-day-value')).toHaveText(`${shown(server.value)} ${server.unit}`)
      else await expect(byId(page, 'weight-logs-empty')).toBeVisible()
      verified('Weight today before logging', server ? await text(page, 'weight-day-value') : 'Nothing logged yet', server)
    }, () => byId(page, 'weight-section'))
    await step(page, 'Weight', 'Log 172.4 lb', async () => {
      await byId(page, 'weight-unit-lb').click()
      await byId(page, 'weight-value').fill('172.4')
      await byId(page, 'weight-log-add').click()
      await expect(byId(page, 'weight-log-last')).toContainText('Logged 172.4 lb at')
      await expect(byId(page, 'weight-day-value')).toHaveText('172.4 lb')
      const server = await weightOn(today)
      expect(server).toEqual({ value: 172.4, unit: 'lb' })
      verified('Weight today after 172.4 lb', await text(page, 'weight-day-value'), server)
    }, () => byId(page, 'weight-section'))
    await step(page, 'Weight', 'Log 78.2 kg: the day shows the latest', async () => {
      await byId(page, 'weight-unit-kg').click()
      await byId(page, 'weight-value').fill('78.2')
      await byId(page, 'weight-log-add').click()
      await expect(byId(page, 'weight-log-last')).toContainText('Logged 78.2 kg at')
      await expect(byId(page, 'weight-day-value')).toHaveText('78.2 kg')
      const server = await weightOn(today)
      expect(server).toEqual({ value: 78.2, unit: 'kg' })
      verified('Weight today after 78.2 kg', await text(page, 'weight-day-value'), server)
    }, () => byId(page, 'weight-section'))
    await step(page, 'Weight', 'The chart converts the latest weight between kg and lb', async () => {
      await byId(page, 'weight-chart-range-week').click()
      await expect(byId(page, 'weight-chart')).toHaveAttribute('data-unit', 'kg')
      await expect(byId(page, 'weight-chart-latest')).toHaveText('78.2 kg')
      await byId(page, 'weight-unit-lb').click()
      await expect(byId(page, 'weight-chart-latest')).toHaveText(`${shown(78.2 / 0.45359237)} lb`)
      verified('Chart latest in lb', await text(page, 'weight-chart-latest'), { kg: 78.2, lb: 78.2 / 0.45359237 })
    }, () => byId(page, 'weight-chart'))

    const ranges = {
      week: { start: localDay(-6), slots: 7 },
      month: { start: localDay(-29), slots: 30 },
      year: { start: (() => { const now = new Date(); return localDay(0, new Date(now.getFullYear(), now.getMonth() - 11, 1, 12)) })(), slots: 12 },
    } as const
    // The API is read once for the whole year, which holds the week and the month too: each day's
    // item is the same whatever range it is asked in. One call returns at most 100 days, which
    // is plenty for the QA user (the demo itself asks in chunks of 90 days).
    let water: Array<{ date: string; total: { value: number } }> | undefined
    let weight: Array<{ date: string; weight: { value: number; unit: string } }> | undefined
    for (const [range, { start, slots }] of Object.entries(ranges)) {
      await step(page, 'Charts', `Water, ${range}`, async () => {
        await byId(page, `water-chart-range-${range}`).click()
        const year: NonNullable<typeof water> = water ??= await waterTotals(ranges.year.start, today, 'fl_oz')
        expect(year.length).toBeLessThan(100)
        const items = year.filter((item) => item.date >= start)
        const total = items.reduce((sum, item) => sum + item.total.value, 0)
        const logged = range === 'year' ? new Set(items.map((item) => item.date.slice(0, 7))).size : items.length
        if (logged) {
          await expect(byId(page, 'water-chart')).toHaveAttribute('data-range', range)
          await expect(byId(page, 'water-chart')).toHaveAttribute('data-slots', String(slots))
          await expect(byId(page, 'water-chart')).toHaveAttribute('data-count', String(logged))
          await expect(byId(page, 'water-chart-total')).toHaveText(`${shown(total)} fl oz`)
        } else {
          await expect(byId(page, 'water-chart-empty')).toBeVisible()
        }
        verified(`Water chart, ${range}`, logged ? await text(page, 'water-chart-total') : 'No water logged in this range', { total, daysOrMonthsLogged: logged, start, end: today })
      }, () => byId(page, 'water-section'))
      await step(page, 'Charts', `Weight, ${range}`, async () => {
        await byId(page, `weight-chart-range-${range}`).click()
        const year: NonNullable<typeof weight> = weight ??= await weights(ranges.year.start, today)
        expect(year.length).toBeLessThan(100)
        const items = year.filter((item) => item.date >= start)
        if (items.length) {
          await expect(byId(page, 'weight-chart')).toHaveAttribute('data-range', range)
          await expect(byId(page, 'weight-chart')).toHaveAttribute('data-count', String(items.length))
          const latest = items.at(-1)!.weight
          const unit = await byId(page, 'weight-chart').getAttribute('data-unit')
          const value = latest.unit === unit ? latest.value : unit === 'lb' ? latest.value / 0.45359237 : latest.value * 0.45359237
          await expect(byId(page, 'weight-chart-latest')).toHaveText(`${shown(value)} ${unit}`)
        } else {
          await expect(byId(page, 'weight-chart-empty')).toBeVisible()
        }
        verified(`Weight chart, ${range}`, items.length ? await text(page, 'weight-chart-latest') : 'No weight logged in this range', { entries: items.length, latest: items.at(-1)?.weight ?? null, start, end: today })
      }, () => byId(page, 'weight-section'))
    }
  })

  test('Food logs: create, list, edit (with the time eaten), summary, and delete @logs', async ({ page }) => {
    let lunchId = ''
    let snackId = ''
    const lunchRow = (name = lunch) => page.getByTestId(/^food-log-\d+$/).filter({ hasText: name })
    await step(page, 'Food logs', 'Load today\'s meals', async () => {
      await openDemo(page, '/food-logs')
      await byId(page, 'food-logs-refresh').click()
      const server = await foodLogs(today)
      if (server.length) await expect(page.getByTestId(/^food-log-\d+$/)).toHaveCount(server.length)
      else await expect(byId(page, 'food-logs-empty')).toBeVisible()
      verified('Meals today', await page.getByTestId(/^food-log-\d+$/).count(), server.length)
    })
    await step(page, 'Food logs', `Create "${lunch}" with banana and apple`, async () => {
      await byId(page, 'food-log-add').click()
      await byId(page, 'food-log-name').fill(lunch)
      for (const food of ['banana', 'apple']) {
        await byId(page, 'food-picker-input').fill(food)
        await byId(page, 'food-log-add-food').click()
        await byId(page, 'food-picker-result-0').click()
      }
      await expect(byId(page, 'food-log-food-1')).toBeVisible()
      await byId(page, 'food-log-food-0').getByTestId('food-log-food-quantity').fill('2')
      await byId(page, 'food-log-save').click()
      await expect(byId(page, 'food-log-editor')).toBeHidden()
      await expect(lunchRow()).toBeVisible()
      const created = (await foodLogs(today)).find((log: { name: string }) => log.name === lunch)
      expect(created).toBeTruthy()
      lunchId = created.id
      rememberCreated('food', lunchId, lunch)
      expect(created.foods.map((food: { quantity: number }) => food.quantity)).toEqual([2, 1])
      await expectMealTime(lunchRow(), created.created_at)
      verified('Created meal', await lunchRow().textContent(), { id: created.id, name: created.name, created_at: created.created_at, createdAtShownAs: mealTime(created.created_at), foods: created.foods.map((food: { name: string; quantity: number }) => `${food.quantity} × ${food.name}`) })
    }, () => lunchRow())
    await step(page, 'Food logs', 'Edit it: rename, 1.5 apples, and an earlier time today', async () => {
      const eatenAt = earlierToday()
      await lunchRow().getByTestId('food-log-edit').click()
      await byId(page, 'food-log-name').fill(`${lunch} (edited)`)
      await byId(page, 'food-log-food-1').getByTestId('food-log-food-quantity').fill('1.5')
      await byId(page, 'food-log-time').fill(eatenAt)
      await byId(page, 'food-log-save').click()
      await expect(byId(page, 'food-log-editor')).toBeHidden()
      await expect(lunchRow(`${lunch} (edited)`)).toBeVisible()
      const server = await foodLog(lunchId)
      expect(server.status).toBe(200)
      expect(server.body.name).toBe(`${lunch} (edited)`)
      expect(server.body.foods.map((food: { quantity: number }) => food.quantity)).toEqual([2, 1.5])
      // `created_at` is when the meal was eaten: the time picked in the editor, to the minute.
      expect(new Date(server.body.created_at).getTime()).toBe(new Date(eatenAt).getTime())
      await expectMealTime(lunchRow(`${lunch} (edited)`), server.body.created_at)
      verified('Edited meal', { row: await lunchRow(`${lunch} (edited)`).textContent(), picked: eatenAt }, { name: server.body.name, quantities: server.body.foods.map((food: { quantity: number }) => food.quantity), created_at: server.body.created_at, createdAtShownAs: mealTime(server.body.created_at) })
    }, () => lunchRow())
    await step(page, 'Food logs', 'Tracking shows the meal, its time, and the day\'s totals from the summary', async () => {
      await openDemo(page, '/tracking')
      const row = page.getByTestId(/^tracking-meal-\d+$/).filter({ hasText: `${lunch} (edited)` })
      await expect(row).toBeVisible()
      const summary = await foodLogSummary(today)
      await expect(byId(page, 'food-day-totals')).toContainText(`${shown(summary.totals.nutrients.calories.value, 0)}kcal`)
      await expect(byId(page, 'food-day-totals')).toContainText(`${shown(summary.totals.nutrients.protein.value, 1)}g`)
      const listed = await foodLogs(today)
      await expect(page.getByTestId(/^tracking-meal-\d+$/)).toHaveCount(listed.length)
      const server = listed.find((log: { id: string }) => log.id === lunchId)
      await expectMealTime(row, server.created_at)
      verified('Day totals and the meal\'s time', { totals: await text(page, 'food-day-totals'), meal: await row.textContent() }, { totals: summary.totals, meals: listed.length, created_at: server.created_at })
    }, () => byId(page, 'food-day-totals'))
    await step(page, 'Food logs', `Add "${snack}" from Tracking`, async () => {
      await byId(page, 'tracking-meal-add').click()
      await byId(page, 'food-log-name').fill(snack)
      await byId(page, 'food-picker-input').fill('greek yogurt')
      await byId(page, 'food-log-add-food').click()
      await byId(page, 'food-picker-result-0').click()
      await byId(page, 'food-log-save').click()
      await expect(byId(page, 'food-log-editor')).toBeHidden()
      const row = page.getByTestId(/^tracking-meal-\d+$/).filter({ hasText: snack })
      await expect(row).toBeVisible()
      const created = (await foodLogs(today)).find((log: { name: string }) => log.name === snack)
      expect(created).toBeTruthy()
      snackId = created.id
      rememberCreated('food', snackId, snack)
      // Added while Tracking shows today, so it is stamped now, on today.
      expect(localDay(0, new Date(created.created_at))).toBe(today)
      expect(Math.abs(Date.parse(created.created_at) - Date.now())).toBeLessThan(10 * 60_000)
      await expectMealTime(row, created.created_at)
      verified('Meal created from Tracking', await row.textContent(), { id: created.id, created_at: created.created_at, createdAtShownAs: mealTime(created.created_at) })
    }, () => page.getByTestId(/^tracking-meal-\d+$/).filter({ hasText: snack }))
    await step(page, 'Food logs', 'Delete the snack on Tracking', async () => {
      await page.getByTestId(/^tracking-meal-\d+$/).filter({ hasText: snack }).getByTestId('tracking-meal-delete').click()
      await expect(page.getByTestId(/^tracking-meal-\d+$/).filter({ hasText: snack })).toHaveCount(0)
      const server = await foodLog(snackId)
      expect(server.status).toBe(404)
      rememberDeleted('food', snackId, 'deleted in the demo')
      verified('Deleted snack', 'gone from Tracking', { status: server.status })
    }, () => byId(page, 'food-section'))
    await step(page, 'Food logs', 'Delete the lunch on Logs', async () => {
      await openDemo(page, '/food-logs')
      await byId(page, 'food-logs-refresh').click()
      await lunchRow().getByTestId('food-log-delete').click()
      await expect(lunchRow()).toHaveCount(0)
      const server = await foodLog(lunchId)
      expect(server.status).toBe(404)
      rememberDeleted('food', lunchId, 'deleted in the demo')
      verified('Deleted lunch', 'gone from Logs', { status: server.status })
    })
  })

  test('Cleanup: delete what this run created and the demo did not @catalog @logs', async ({ page }) => {
    await step(page, 'Cleanup', 'Delete the water and food logs still in the ledger', async () => {
      setLogContext('cleanup')
      const results = await cleanup()
      observed('Deleted', results)
      // Water deletes answer 204 even when the log is already gone; food answers 404 then.
      expect(results.every(({ status, kind }) => status < 300 || (kind === 'food' && status === 404))).toBe(true)
      for (const { id, kind } of results) {
        if (kind === 'food') expect((await foodLog(id)).status).toBe(404)
      }
      const baseline = run.baseline as { today: { water: { fl_oz: number } }; yesterday: { water: { fl_oz: number } } }
      const after = { today: await waterTotal(today, 'fl_oz'), yesterday: await waterTotal(yesterday, 'fl_oz') }
      expect(after.today).toBeCloseTo(baseline.today.water.fl_oz, 1)
      expect(after.yesterday).toBeCloseTo(baseline.yesterday.water.fl_oz, 1)
      verified('Water (fl oz) after cleanup, against the baseline', after, { today: baseline.today.water.fl_oz, yesterday: baseline.yesterday.water.fl_oz })
    })
  })

  test('Tracking day picker @logs', async ({ page }) => {
    await step(page, 'Day picker', 'Tracking opens on today, and the next day is disabled', async () => {
      await openDemo(page, '/tracking')
      await expect(byId(page, 'logs-day-label')).toHaveText('Today')
      await expect(byId(page, 'logs-day-input')).toHaveValue(today)
      await expect(byId(page, 'logs-day-next')).toBeDisabled()
      await expect(byId(page, 'logs-day-today')).toBeDisabled()
      verified('Today (local, not UTC)', await byId(page, 'logs-day-input').inputValue(), { localToday: today, utcToday: new Date().toISOString().slice(0, 10), timezone })
    }, () => byId(page, 'logs-day-card'))
    for (const [label, offset] of [['Yesterday', -1], ['Three days ago', -3]] as const) {
      await step(page, 'Day picker', `${label}: meals, water, and weight match the API`, async () => {
        const day = localDay(offset)
        if (offset === -1) await byId(page, 'logs-day-previous').click()
        else await byId(page, 'logs-day-input').fill(day)
        await expect(byId(page, 'logs-day-input')).toHaveValue(day)
        if (offset === -1) await expect(byId(page, 'logs-day-label')).toHaveText('Yesterday')
        const server = { meals: await foodLogs(day), water: await waterTotal(day, 'fl_oz'), weight: await weightOn(day) }
        if (server.meals.length) await expect(page.getByTestId(/^tracking-meal-\d+$/)).toHaveCount(server.meals.length)
        else await expect(byId(page, 'tracking-meals-empty')).toBeVisible()
        if (server.water) await expect(byId(page, 'water-day-total')).toHaveText(`${shown(server.water)} fl oz`)
        else await expect(byId(page, 'water-logs-empty')).toBeVisible()
        if (server.weight) await expect(byId(page, 'weight-day-value')).toHaveText(`${shown(server.weight.value)} ${server.weight.unit}`)
        else await expect(byId(page, 'weight-logs-empty')).toBeVisible()
        verified(`${label} (${day})`, await byId(page, 'logs-day-label').textContent(), server)
      }, () => byId(page, 'logs-day-card'))
    }
    await step(page, 'Day picker', 'A date after today is held at today', async () => {
      await byId(page, 'logs-day-input').fill(localDay(2))
      await expect(byId(page, 'logs-day-label')).toHaveText('Today')
      await expect(byId(page, 'logs-day-input')).toHaveValue(today)
    }, () => byId(page, 'logs-day-card'))
    await step(page, 'Day picker', 'Today returns from another day, and Reload day asks again', async () => {
      await byId(page, 'logs-day-previous').click()
      await byId(page, 'logs-day-today').click()
      await expect(byId(page, 'logs-day-label')).toHaveText('Today')
      await byId(page, 'logs-day-refresh').click()
      await expect(byId(page, 'food-day-totals')).toBeVisible()
    }, () => byId(page, 'logs-day-card'))
  })
})
