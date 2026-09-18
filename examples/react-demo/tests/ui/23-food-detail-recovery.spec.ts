import { expect, test } from '@playwright/test'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Food detail glucose recovers without losing context', async ({ page }) => {
  await control('/v1.2/glucose/predictions', { status: 500 })
  await openDemo(page, '/search')
  await byId(page, 'search-input').fill('pizza')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'search-results')).toBeVisible()
  await expect(byId(page, 'food-result-0')).toContainText('Fixture Pizza')
  await byId(page, 'food-result-0').click()
  await expect(byId(page, 'food-detail-screen')).toBeVisible()
  await byId(page, 'food-check-glucose').click()
  await expect(byId(page, 'food-glucose-error')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Fixture Pizza' })).toBeVisible()

  await control('/v1.2/glucose/predictions', { status: 200 })
  await byId(page, 'food-check-glucose').click()
  await expect(byId(page, 'food-glucose-result')).toBeVisible()
  await expect(byId(page, 'food-glucose-error')).toHaveCount(0)
})
