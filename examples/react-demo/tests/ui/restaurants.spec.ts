import { expect, test, type Page } from './fixtures'

import { fixtureApi, openDemo } from './demo'

async function control(route: string, options: { status?: number; empty?: boolean } = {}) {
  const query = new URLSearchParams({ route })
  if (options.status) query.set('status', String(options.status))
  if (options.empty) query.set('empty', 'true')
  await fetch(`${fixtureApi}/__control?${query}`)
}

async function openRestaurant(page: Page) {
  await openDemo(page, '/search')
  await expect(page.getByRole('button', { name: 'Search foods' })).toBeVisible()
  await page.getByText('Restaurants', { exact: true }).click()
  await expect(page.getByRole('button', { name: 'Search nearby' })).toBeVisible()
  await page.locator('#catalog-search').fill('Fixture Cafe')
  await page.getByRole('button', { name: 'Search nearby' }).click()
  await page.getByRole('button', { name: /Fixture Cafe/ }).click()
}

test.beforeEach(async () => {
  await fetch(`${fixtureApi}/__reset`)
})

test('loads the selected restaurant menu by ID', async ({ page }) => {
  await openRestaurant(page)
  await expect(page.getByText('Fixture bowl')).toBeVisible()
  await expect(page.getByText('Fixture soup')).toBeVisible()
  const calls = await (await fetch(`${fixtureApi}/__requests`)).json() as Array<{ path: string }>
  expect(calls.some(({ path }) => path === '/v1.2/restaurants/cafe/menu-items')).toBe(true)
  expect(calls.some(({ path }) => path === '/v1.2/menu-items')).toBe(false)
})

test('searches within a restaurant and resets to the full menu', async ({ page }) => {
  await openRestaurant(page)
  await page.getByRole('searchbox', { name: 'Search this menu' }).fill('SOUP')
  await page.getByRole('button', { name: 'Search menu', exact: true }).click()
  await expect(page.getByText('Fixture soup', { exact: true })).toBeVisible()
  await expect(page.getByText('Fixture bowl', { exact: true })).toHaveCount(0)
  const calls = await (await fetch(`${fixtureApi}/__requests`)).json() as Array<{ path: string; query: Record<string, string> }>
  expect(calls.some(({ path, query }) => path === '/v1.2/restaurants/cafe/menu-items' && query.query === 'SOUP' && query.offset === '0')).toBe(true)
  expect(calls.some(({ path }) => path === '/v1.2/menu-items')).toBe(false)
  await page.getByRole('searchbox', { name: 'Search this menu' }).fill('unavailable dish')
  await page.getByRole('button', { name: 'Search menu', exact: true }).click()
  await expect(page.getByTestId('menu-empty')).toContainText('No dishes match')
  await page.getByRole('button', { name: 'Show full menu' }).click()
  await expect(page.getByText('Fixture bowl', { exact: true })).toBeVisible()
  await expect(page.getByText('Fixture soup', { exact: true })).toBeVisible()
})

test('shows restaurant-not-found errors without searching other restaurants', async ({ page }) => {
  await control('/v1.2/restaurants/cafe/menu-items', { status: 404 })
  await openRestaurant(page)
  await expect(page.getByTestId('menu-error')).toBeVisible()
  const calls = await (await fetch(`${fixtureApi}/__requests`)).json() as Array<{ path: string }>
  expect(calls.some(({ path }) => path === '/v1.2/menu-items')).toBe(false)
})

test('shows an error for 500 and recovers on retry', async ({ page }) => {
  await control('/v1.2/restaurants/cafe/menu-items', { status: 500 })
  await openRestaurant(page)
  await expect(page.getByText('Request failed')).toBeVisible()
  const screenshot = test.info().outputPath('restaurant-menu-error.png')
  await page.screenshot({ path: screenshot })
  await test.info().attach('restaurant-menu-error', { path: screenshot, contentType: 'image/png' })
  await control('/v1.2/restaurants/cafe/menu-items')
  await page.getByRole('button', { name: /try again/i }).click()
  await expect(page.getByText('Fixture bowl')).toBeVisible()
})
