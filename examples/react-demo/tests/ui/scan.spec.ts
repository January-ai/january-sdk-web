import { expect, test } from '@playwright/test'
import { fixtureApi, openDemo } from './demo'


test.beforeEach(async () => {
  await fetch(`${fixtureApi}/__reset`)
})

test('looks up a UPC and opens the matching food', async ({ page }) => {
  await openDemo(page, '/scan')
  await page.getByRole('tab', { name: 'UPC code' }).click()
  await page.getByRole('textbox', { name: 'UPC code' }).fill('012345678905')
  await page.getByRole('button', { name: 'Look up UPC' }).click()
  await page.getByRole('button', { name: /Fixture Pizza/ }).click()
  await expect(page).toHaveURL(/\/food\/food-1/)
  await expect(page.getByRole('heading', { name: 'Fixture Pizza' })).toBeVisible()
})

test('analyzes the sample meal photo and renders detections', async ({ page }) => {
  await openDemo(page, '/scan')
  await page.getByRole('button', { name: 'Use sample meal' }).click()
  await page.getByRole('button', { name: 'Analyze meal' }).click()
  await expect(page.getByRole('dialog', { name: 'Meal analysis' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Fixture photo meal' })).toBeVisible()
  await expect(page.getByText('Fixture Pizza', { exact: true })).toBeVisible()
})

test('shows a barcode lookup server error', async ({ page }) => {
  await fetch(`${fixtureApi}/__control?route=/v1.2/foods/barcode/012345678905&status=500`)
  await openDemo(page, '/scan')
  await page.getByRole('tab', { name: 'UPC code' }).click()
  await page.getByRole('textbox', { name: 'UPC code' }).fill('012345678905')
  await page.getByRole('button', { name: 'Look up UPC' }).click()
  await expect(page.getByText('Request failed')).toBeVisible()
})
