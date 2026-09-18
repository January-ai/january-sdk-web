import { expect, test } from '@playwright/test'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Glucose meal prediction', async ({ page }) => {
  await openDemo(page, '/glucose')
  await byId(page, 'food-picker-input').fill('pizza')
  await byId(page, 'glucose-add-food').click()
  await byId(page, 'food-picker-result-0').click()
  await expect(byId(page, 'glucose-food-0')).toContainText('Fixture Pizza')
  await byId(page, 'glucose-predict').click()
  await expect(byId(page, 'glucose-results-screen')).toBeVisible()
  await expect(byId(page, 'glucose-chart')).toBeVisible()
  await expect(page.getByText('Likely peak').first()).toBeVisible()
  await expect(page.getByText(/medium impact/i)).toBeVisible()
})
