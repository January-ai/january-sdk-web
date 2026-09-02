import { expect, test } from '@playwright/test'
import { fixtureApi, openDemo } from './demo'


test.beforeEach(async () => {
  await fetch(`${fixtureApi}/__reset`)
})

test('searches foods, opens string-ID details, and predicts glucose', async ({ page }) => {
  await openDemo(page, '/search')
  await page.locator('#catalog-search').fill('pizza')
  await page.getByRole('button', { name: 'Search foods' }).click()
  await page.getByRole('button', { name: /Fixture Pizza/ }).click()

  await expect(page).toHaveURL(/\/food\/food-1/)
  await expect(page.getByRole('heading', { name: 'Fixture Pizza' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Serving' })).toHaveValue('11')

  await page.getByRole('button', { name: 'Check glucose' }).click()
  await expect(page.getByText('Likely peak')).toBeVisible()
  await expect(page.getByText('132')).toBeVisible()
})

test('shows an empty food-search state without an error', async ({ page }) => {
  await fetch(`${fixtureApi}/__control?route=/v1.2/foods&empty=true`)
  await openDemo(page, '/search')
  await page.locator('#catalog-search').fill('missing food')
  await page.getByRole('button', { name: 'Search foods' }).click()
  await expect(page.getByText('No foods matched')).toBeVisible()
  await expect(page.getByText('Request failed')).toHaveCount(0)
})

test('runs natural-language food analysis', async ({ page }) => {
  await openDemo(page, '/search')
  await page.getByRole('radio', { name: 'Meal description' }).check({ force: true })
  await page.locator('#catalog-search').fill('pizza and salad')
  await page.getByRole('button', { name: 'Search foods' }).click()
  await expect(page.getByRole('button', { name: /Fixture Pizza/ })).toBeVisible()
})

test('surfaces a food-search server error', async ({ page }) => {
  await fetch(`${fixtureApi}/__control?route=/v1.2/foods&status=500`)
  await openDemo(page, '/search')
  await page.locator('#catalog-search').fill('pizza')
  await page.getByRole('button', { name: 'Search foods' }).click()
  await expect(page.getByText('Request failed')).toBeVisible()
})
