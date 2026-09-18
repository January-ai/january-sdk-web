import { expect, test } from '@playwright/test'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Native parity - categorized food search errors', async ({ page }) => {
  await openDemo(page, '/search')

  await control('/v1.2/foods', { status: 401 })
  await byId(page, 'search-input').fill('pizza')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'search-error')).toBeVisible()
  await expect(byId(page, 'search-error')).toContainText('Request failed')
  await page.screenshot({ path: 'test-results/artifacts/web-search-error-401.png' })

  await control('/v1.2/foods', { status: 403 })
  await byId(page, 'search-input').fill('pizza')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'search-error')).toBeVisible()
  await expect(byId(page, 'search-error')).toContainText('Request failed')
  await page.screenshot({ path: 'test-results/artifacts/web-search-error-403.png' })

  await control('/v1.2/foods', { status: 404 })
  await byId(page, 'search-input').fill('pizza')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'search-error')).toBeVisible()
  await expect(byId(page, 'search-error')).toContainText('Request failed')
  await page.screenshot({ path: 'test-results/artifacts/web-search-error-404.png' })

  await control('/v1.2/foods', { status: 422 })
  await byId(page, 'search-input').fill('pizza')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'search-error')).toBeVisible()
  await expect(byId(page, 'search-error')).toContainText('Request failed')
  await page.screenshot({ path: 'test-results/artifacts/web-search-error-422.png' })

  await control('/v1.2/foods', { status: 429 })
  await byId(page, 'search-input').fill('pizza')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'search-error')).toBeVisible()
  await expect(byId(page, 'search-error')).toContainText('Request failed')
  await page.screenshot({ path: 'test-results/artifacts/web-search-error-429.png' })

  await control('/v1.2/foods', { status: 504 })
  await byId(page, 'search-input').fill('pizza')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'search-error')).toBeVisible()
  await expect(byId(page, 'search-error')).toContainText('Request failed')
  await page.screenshot({ path: 'test-results/artifacts/web-search-error-504.png' })
})
