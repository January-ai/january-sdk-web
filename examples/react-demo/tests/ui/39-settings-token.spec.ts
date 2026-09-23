import { expect, test } from '@playwright/test'
import { byId, control, fixtureRequests, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('The relay mints a token, and a relay failure is shown', async ({ page }) => {
  await openDemo(page, '/search')
  const card = byId(page, 'configuration-card').filter({ visible: true })
  await expect(card.getByTestId('relay-status')).toHaveText('Online')
  await card.getByTestId('token-mint').click()
  await expect(card.getByTestId('token-status')).toContainText('Token ready')
  const mints = (await fixtureRequests()).filter(({ path }) => path === '/api/january/client-token')
  expect(mints.length).toBeGreaterThan(0)

  await control('/api/january/client-token', { status: 500 })
  await card.getByTestId('token-mint').click()
  await expect(card.getByTestId('token-mint-error')).toHaveText('The test request could not be completed.')
  await expect(card.getByTestId('token-status')).toHaveText('The test request could not be completed.')

  await control('/api/january/client-token', { status: 200 })
  await card.getByTestId('token-mint').click()
  await expect(card.getByTestId('token-mint-error')).toHaveCount(0)
  await expect(card.getByTestId('token-status')).toContainText('Token ready')
})

test('The active user is kept in this browser across pages', async ({ page }) => {
  await openDemo(page, '/food-logs')
  await byId(page, 'settings-user-input').fill('someone-else')
  await byId(page, 'settings-timezone-input').fill('Europe/London')
  await byId(page, 'settings-save').click()
  await expect(byId(page, 'settings-user-id')).toHaveText('someone-else · Europe/London')

  await openDemo(page, '/glucose')
  await expect(byId(page, 'settings-user-id')).toHaveText('someone-else · Europe/London')
  await byId(page, 'settings-clear').click()
  await expect(byId(page, 'settings-user-id')).toHaveCount(0)
  await expect(byId(page, 'settings-save')).toBeDisabled()
})
