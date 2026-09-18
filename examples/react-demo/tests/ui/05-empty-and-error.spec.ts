import { expect, test } from '@playwright/test'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Empty and error states are actionable', async ({ page }) => {
  await control('/v1.2/foods', { empty: true })
  await openDemo(page, '/search')
  await byId(page, 'search-input').fill('nothing')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'empty-results')).toBeVisible()
  await expect(page.getByText('No foods matched')).toBeVisible()

  await control('/v1.2/foods', { status: 500 })
  await byId(page, 'search-input').fill('broken')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'search-error')).toBeVisible()
  await expect(byId(page, 'search-error')).toContainText('Request failed')
})
