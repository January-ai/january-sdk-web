import { expect, test } from '@playwright/test'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Glucose failure retains the meal then recovers', async ({ page }) => {
  await control('/v1.2/glucose/predictions', { status: 500 })
  await openDemo(page, '/glucose')
  await byId(page, 'glucose-age').fill('42')
  await byId(page, 'food-picker-input').fill('pizza')
  await byId(page, 'glucose-add-food').click()
  await byId(page, 'food-picker-result-0').click()
  await expect(byId(page, 'glucose-food-0')).toContainText('Fixture Pizza')
  await byId(page, 'glucose-predict').click()
  await expect(byId(page, 'glucose-error')).toBeVisible()
  await expect(byId(page, 'glucose-food-0')).toContainText('Fixture Pizza')
  await expect(byId(page, 'glucose-age')).toHaveValue('42')

  await control('/v1.2/glucose/predictions', { status: 200 })
  await byId(page, 'glucose-predict').click()
  await expect(byId(page, 'glucose-results-screen')).toBeVisible()
  await expect(byId(page, 'glucose-chart')).toBeVisible()
  await expect(page.getByText('Likely peak')).toBeVisible()
})
