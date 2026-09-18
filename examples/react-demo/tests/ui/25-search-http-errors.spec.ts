import { expect, test } from '@playwright/test'
import { byId, control, fixtureRequests, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Native parity - categorized food search errors', async ({ page }) => {
  await openDemo(page, '/search')

  await control('/v1.2/foods', { status: 401 })
  // The demo caches results per query, so each status uses its own term.
  await byId(page, 'search-input').fill('pizza 401')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'search-error')).toBeVisible()
  await expect(byId(page, 'search-error')).toContainText('Request failed')
  await page.screenshot({ path: 'test-results/artifacts/web-search-error-401.png' })

  await control('/v1.2/foods', { status: 403 })
  // The demo caches results per query, so each status uses its own term.
  await byId(page, 'search-input').fill('pizza 403')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'search-error')).toBeVisible()
  await expect(byId(page, 'search-error')).toContainText('Request failed')
  await page.screenshot({ path: 'test-results/artifacts/web-search-error-403.png' })

  await control('/v1.2/foods', { status: 404 })
  // The demo caches results per query, so each status uses its own term.
  await byId(page, 'search-input').fill('pizza 404')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'search-error')).toBeVisible()
  await expect(byId(page, 'search-error')).toContainText('Request failed')
  await page.screenshot({ path: 'test-results/artifacts/web-search-error-404.png' })

  await control('/v1.2/foods', { status: 422 })
  // The demo caches results per query, so each status uses its own term.
  await byId(page, 'search-input').fill('pizza 422')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'search-error')).toBeVisible()
  await expect(byId(page, 'search-error')).toContainText('Request failed')
  await page.screenshot({ path: 'test-results/artifacts/web-search-error-422.png' })

  await control('/v1.2/foods', { status: 429 })
  // The demo caches results per query, so each status uses its own term.
  await byId(page, 'search-input').fill('pizza 429')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'search-error')).toBeVisible()
  await expect(byId(page, 'search-error')).toContainText('Request failed')
  await page.screenshot({ path: 'test-results/artifacts/web-search-error-429.png' })

  await control('/v1.2/foods', { status: 504 })
  // The demo caches results per query, so each status uses its own term.
  await byId(page, 'search-input').fill('pizza 504')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'search-error')).toBeVisible()
  await expect(byId(page, 'search-error')).toContainText('Request failed')
  await page.screenshot({ path: 'test-results/artifacts/web-search-error-504.png' })

  // Every status block reached the server with its own term; a cached error
  // from an earlier block would leave a term missing here.
  const searched = new Set((await fixtureRequests())
    .filter((request) => request.path === '/v1.2/foods')
    .map((request) => request.query.query))
  expect([...searched].sort()).toEqual(['pizza 401', 'pizza 403', 'pizza 404', 'pizza 422', 'pizza 429', 'pizza 504'])
})
