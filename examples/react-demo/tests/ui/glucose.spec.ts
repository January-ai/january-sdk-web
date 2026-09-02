import { expect, test } from '@playwright/test'
import { fixtureApi, openDemo } from './demo'


test.beforeEach(async () => {
  await fetch(`${fixtureApi}/__reset`)
})

test('selects a string-ID food and completes glucose prediction', async ({ page }) => {
  await openDemo(page, '/glucose')
  await page.getByPlaceholder('Search for a food').fill('pizza')
  await page.getByRole('button', { name: 'Find' }).click()
  await page.getByRole('button', { name: /Fixture Pizza/ }).click()
  await expect(page.getByText('Fixture Pizza', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Predict glucose response' }).click()
  await expect(page.getByText('Likely peak')).toBeVisible()
  await expect(page.getByText('132')).toBeVisible()
})

test('surfaces prediction failures and keeps the selected meal', async ({ page }) => {
  await openDemo(page, '/glucose')
  await page.getByPlaceholder('Search for a food').fill('pizza')
  await page.getByRole('button', { name: 'Find' }).click()
  await page.getByRole('button', { name: /Fixture Pizza/ }).click()
  await fetch(`${fixtureApi}/__control?route=/v1.2/glucose/predictions&status=500`)
  await page.getByRole('button', { name: 'Predict glucose response' }).click()
  await expect(page.getByText('Request failed')).toBeVisible()
  await expect(page.getByText('Fixture Pizza', { exact: true })).toBeVisible()
})
