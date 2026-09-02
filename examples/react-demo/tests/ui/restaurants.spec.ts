import { expect, test, type Page } from '@playwright/test'

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

test('silently falls back to menu search for a production-style 404', async ({ page }) => {
  await control('/v1.2/restaurants/cafe/menu-items', { status: 404 })
  await openRestaurant(page)
  await expect(page.getByText('Fixture bowl')).toBeVisible()
  await expect(page.getByText(/couldn.t complete/i)).toHaveCount(0)
  const calls = await (await fetch(`${fixtureApi}/__requests`)).json() as Array<{ path: string }>
  expect(calls.map(({ path }) => path)).toEqual(expect.arrayContaining([
    '/v1.2/restaurants/cafe/menu-items',
    '/v1.2/menu-items',
  ]))
})

test('shows the empty state when the 404 fallback has no matching menu', async ({ page }) => {
  await control('/v1.2/restaurants/cafe/menu-items', { status: 404 })
  await control('/v1.2/menu-items', { empty: true })
  await openRestaurant(page)
  await expect(page.getByText('No matching menu items were returned for this restaurant.')).toBeVisible()
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
