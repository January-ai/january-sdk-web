import { expect, test } from '@playwright/test'

const fixtureApi = 'http://127.0.0.1:18767'

async function control(route: string, status: number) {
  const query = new URLSearchParams({ route, status: String(status) })
  await fetch(`${fixtureApi}/__control?${query}`)
}

test.beforeEach(async () => {
  await fetch(`${fixtureApi}/__reset`)
})

test('shows client-token mode and the running relay', async ({ page }) => {
  await page.goto('/search')
  const status = page.getByRole('region', { name: 'Authentication status' })
  await expect(status.getByText('Client token exchange (ct-…)')).toBeVisible()
  await expect(status.getByText('Online')).toBeVisible()
  await expect(status.getByText(/There is no stored refresh token/)).toBeVisible()
})

test('mints a fresh client token through the relay', async ({ page }) => {
  await page.goto('/search')
  const status = page.getByRole('region', { name: 'Authentication status' })
  await status.getByRole('button', { name: 'Mint fresh token' }).click()
  await expect(status.getByText('Token ready')).toBeVisible()
  const requests = await (await fetch(`${fixtureApi}/__requests`)).json() as Array<{
    authorization: string | null
    method: string
    path: string
  }>
  expect(requests).toContainEqual(expect.objectContaining({
    authorization: null,
    method: 'POST',
    path: '/api/january/client-token',
  }))
})

test('shows startup commands when the local relay is offline', async ({ page }) => {
  await control('/', 503)
  await page.goto('/search')
  const status = page.getByRole('region', { name: 'Authentication status' })
  await expect(status.getByText('Offline')).toBeVisible()
  await expect(status.getByText('./start.sh')).toBeVisible()
  await expect(status.getByText('npm run dev', { exact: true })).toBeVisible()
})
