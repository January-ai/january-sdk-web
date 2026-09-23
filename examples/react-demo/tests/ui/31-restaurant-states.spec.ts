import { expect, test, type Page } from '@playwright/test'
import { byId, control, fixtureRequests, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

async function searchRestaurants(page: Page, query: string) {
  await byId(page, 'restaurant-search-input').fill(query)
  await byId(page, 'restaurant-search-submit').click()
}

test('Restaurant search loading, results, empty, and failure', async ({ page }) => {
  await control('/v1.2/restaurants', { delay: 2 })
  await openDemo(page, '/search')
  await byId(page, 'search-scope-restaurants').click()
  await byId(page, 'location-city').selectOption('new-york')
  await expect(byId(page, 'location-coordinates')).toHaveText('40.7128, -74.0060')
  await searchRestaurants(page, 'pizza')
  await expect(byId(page, 'restaurants-loading')).toBeVisible()
  await expect(byId(page, 'restaurant-results')).toBeVisible({ timeout: 15_000 })
  const search = (await fixtureRequests()).find(({ path }) => path === '/v1.2/restaurants')
  expect(search?.query).toMatchObject({ query: 'pizza', latitude: '40.7128', longitude: '-74.006' })

  await control('/v1.2/restaurants', { empty: true })
  await searchRestaurants(page, 'nothing nearby')
  await expect(byId(page, 'restaurants-empty')).toBeVisible()
  await expect(byId(page, 'restaurants-empty')).toContainText('No restaurants nearby')

  await control('/v1.2/restaurants', { status: 500 })
  await searchRestaurants(page, 'broken')
  await expect(byId(page, 'restaurants-error')).toBeVisible()
  await expect(byId(page, 'restaurants-error-details-body')).toHaveText('The test request could not be completed.')
})

test('Menu loading, empty, failure, and retry', async ({ page }) => {
  await control('/v1.2/restaurants/cafe/menu-items', { delay: 2 })
  await openDemo(page, '/search')
  await byId(page, 'search-scope-restaurants').click()
  await searchRestaurants(page, 'Fixture Cafe')
  await byId(page, 'restaurant-result-0').click()
  await expect(byId(page, 'menu-loading')).toBeVisible()
  await expect(byId(page, 'menu-results')).toBeVisible({ timeout: 15_000 })

  // The menu is asked for per restaurant and location, so a new city asks again.
  await control('/v1.2/restaurants/cafe/menu-items', { empty: true })
  await byId(page, 'location-city').selectOption('chicago')
  await expect(byId(page, 'menu-empty')).toBeVisible()

  await control('/v1.2/restaurants/cafe/menu-items', { status: 500 })
  await byId(page, 'location-city').selectOption('austin')
  await expect(byId(page, 'menu-error')).toBeVisible()
  await control('/v1.2/restaurants/cafe/menu-items', { status: 200 })
  await byId(page, 'menu-error-retry').click()
  await expect(byId(page, 'restaurant-menu-item-0')).toContainText('Fixture bowl')
})

test('Current location moves the search', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 30.2672, longitude: -97.7431 })
  await openDemo(page, '/search')
  await byId(page, 'search-scope-restaurants').click()
  await byId(page, 'location-current').click()
  await expect(byId(page, 'location-city')).toHaveValue('current')
  await expect(byId(page, 'location-coordinates')).toHaveText('30.2672, -97.7431')
  await searchRestaurants(page, 'tacos')
  await expect(byId(page, 'restaurant-result-0')).toBeVisible()
  const search = (await fixtureRequests()).find(({ path }) => path === '/v1.2/restaurants')
  expect(search?.query).toMatchObject({ latitude: '30.2672', longitude: '-97.7431' })
})

test('A blocked location keeps the chosen city', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_success, failure) => {
      failure?.({ code: 1, message: 'User denied Geolocation', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError)
    }
  })
  await openDemo(page, '/search')
  await byId(page, 'search-scope-restaurants').click()
  await byId(page, 'location-current').click()
  await expect(byId(page, 'location-error')).toContainText('Allow location access')
  await expect(byId(page, 'location-city')).toHaveValue('san-francisco')
})
