import { expect, test } from './fixtures'
import { byId, control, fixtureRequests, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('The relay mints a token, and a relay failure is shown', async ({ page }) => {
  // The relay's health check answers slowly, so the card shows it is checking first.
  await control('/', { delay: 0.8 })
  await openDemo(page, '/search')
  const card = byId(page, 'configuration-card').filter({ visible: true })
  await expect(card.getByTestId('configuration-loading')).toHaveText('Checking authentication…')
  await expect(card.getByTestId('relay-status')).toHaveText('Online')
  await expect(card.getByTestId('configuration-loading')).toHaveCount(0)
  await control('/', { delay: 0 })

  // "Token ready" may already show from an earlier request, so wait for the mint itself.
  await card.getByTestId('token-mint').click()
  await expect(card.getByTestId('token-mint')).toHaveText('Mint fresh token')
  await expect(card.getByTestId('token-mint')).toBeEnabled()
  await expect(card.getByTestId('token-status')).toContainText('Token ready')
  const mints = (await fixtureRequests()).filter(({ path }) => path === '/api/january/client-token')
  expect(mints.length).toBeGreaterThan(0)

  await control('/api/january/client-token', { status: 500 })
  await card.getByTestId('token-mint').click()
  await expect(card.getByTestId('token-mint')).toBeEnabled()
  await expect(card.getByTestId('token-mint-error')).toHaveText('The test request could not be completed.')
  await expect(card.getByTestId('token-status')).toHaveText('The test request could not be completed.')

  await control('/api/january/client-token', { status: 200 })
  await card.getByTestId('token-mint').click()
  await expect(card.getByTestId('token-mint-error')).toHaveCount(0)
  await expect(card.getByTestId('token-status')).toContainText('Token ready')
})

test('A user ID typed before the configuration arrives is kept', async ({ page }) => {
  // The configuration waits on the relay's health check; hold it back so the
  // default user arrives after typing has started.
  await control('/', { delay: 1.5 })
  await openDemo(page, '/food-logs')
  await byId(page, 'settings-user-input').fill('typed-early')
  await expect(byId(page, 'settings-user-id')).toContainText('fixture-user')
  await expect(byId(page, 'settings-user-input')).toHaveValue('typed-early')
  await control('/', { delay: 0 })
  await byId(page, 'settings-save').click()
  await expect(byId(page, 'settings-user-id')).toContainText('typed-early')
  await expect(byId(page, 'settings-user-input')).toHaveValue('typed-early')
})

test('The active user is kept in this browser across pages', async ({ page }) => {
  await openDemo(page, '/food-logs')
  // The default user arrives with the demo's configuration; type once it is shown.
  await expect(byId(page, 'settings-user-id')).toContainText('fixture-user')
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
