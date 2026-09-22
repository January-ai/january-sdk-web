import { expect, test } from '@playwright/test'
import { fixtureApi, openDemo } from './demo'


test.beforeEach(async () => {
  await fetch(`${fixtureApi}/__reset`)
})

test('loads food logs with nullable contract fields', async ({ page }) => {
  await openDemo(page, '/food-logs')
  await page.getByRole('button', { name: 'Load food logs' }).click()
  await expect(page.getByRole('heading', { name: 'Fixture lunch' })).toBeVisible()
  await expect(page.getByText('Fixture Pizza', { exact: true })).toBeVisible()
})

test('creates a meal using opaque string food and serving IDs', async ({ page }) => {
  await openDemo(page, '/food-logs')
  await page.getByRole('button', { name: 'Add meal' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add a meal' })
  await dialog.getByPlaceholder('Search foods to add').fill('pizza')
  await dialog.getByRole('button', { name: 'Find' }).click()
  await dialog.getByRole('button', { name: /Fixture Pizza/ }).last().click()
  await expect(dialog.getByText('Fixture Pizza', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Create meal' }).click()
  await expect(dialog).toBeHidden()
  const requests = await (await fetch(`${fixtureApi}/__requests`)).json() as Array<{ method: string; path: string }>
  expect(requests.some(({ method, path }) => method === 'POST' && path === '/v1.2/food-logs')).toBe(true)
})

test('updates and deletes an existing meal', async ({ page }) => {
  await openDemo(page, '/food-logs')
  await page.getByRole('button', { name: 'Load food logs' }).click()
  await page.getByRole('button', { name: 'Edit Fixture lunch' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit meal' })
  await dialog.getByLabel('Meal name (optional)').fill('Updated lunch')
  await dialog.getByRole('button', { name: 'Update meal' }).click()
  await expect(dialog).toBeHidden()
  await page.getByRole('button', { name: 'Delete Fixture lunch' }).click()
  await expect.poll(async () => {
    const requests = await (await fetch(`${fixtureApi}/__requests`)).json() as Array<{ method: string; path: string }>
    return {
      updated: requests.some(({ method, path }) => method === 'PATCH' && path === '/v1.2/food-logs/log-1'),
      deleted: requests.some(({ method, path }) => method === 'DELETE' && path === '/v1.2/food-logs/log-1'),
    }
  }).toEqual({ updated: true, deleted: true })
})

test('shows the empty logs state', async ({ page }) => {
  await fetch(`${fixtureApi}/__control?route=/v1.2/food-logs&empty=true`)
  await openDemo(page, '/food-logs')
  await page.getByRole('button', { name: 'Load food logs' }).click()
  await expect(page.getByText('No food logs found')).toBeVisible()
})
