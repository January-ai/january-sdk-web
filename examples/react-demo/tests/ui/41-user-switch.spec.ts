import { expect, test } from './fixtures'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Switching the active user drops the previous user’s entries and meals', async ({ page }) => {
  await openDemo(page, '/tracking')
  await expect(byId(page, 'tracking-meal-0')).toContainText('Fixture lunch')

  // The first user logs water and weight, so both "last logged" notes and delete-last show.
  await byId(page, 'water-amount').fill('8')
  await byId(page, 'water-log-add').click()
  await expect(byId(page, 'water-log-last')).toContainText('Logged 8 fl oz')
  await byId(page, 'weight-log-add').click()
  await expect(byId(page, 'weight-log-last')).toBeVisible()

  // Hold the next user's meals back, then switch user: nothing of the first user may show meanwhile.
  await control('/v1.2/food-logs', { delay: 2 })
  await byId(page, 'settings-user-input').fill('second-user')
  await byId(page, 'settings-save').click()
  await expect(byId(page, 'settings-user-id')).toContainText('second-user')
  await expect(byId(page, 'water-log-last')).toHaveCount(0)
  await expect(byId(page, 'water-log-delete')).toHaveCount(0)
  await expect(byId(page, 'weight-log-last')).toHaveCount(0)
  await expect(byId(page, 'tracking-meal-list')).toHaveCount(0)
  await expect(byId(page, 'tracking-meals-loading')).toBeVisible()

  await control('/v1.2/food-logs', { delay: 0 })
  await expect(byId(page, 'tracking-meal-0')).toBeVisible()
})

test('Switching the active user on Logs clears the previous user’s meal history', async ({ page }) => {
  await openDemo(page, '/food-logs')
  await expect(byId(page, 'settings-user-id')).toContainText('fixture-user')
  await byId(page, 'food-logs-refresh').click()
  await expect(byId(page, 'food-log-0')).toContainText('Fixture lunch')

  // The list was loaded for the first user; after the switch it must not stay on screen.
  await byId(page, 'settings-user-input').fill('second-user')
  await byId(page, 'settings-save').click()
  await expect(byId(page, 'settings-user-id')).toContainText('second-user')
  await expect(byId(page, 'food-log-list')).toHaveCount(0)
  await expect(byId(page, 'food-logs-prompt')).toBeVisible()

  await byId(page, 'food-logs-refresh').click()
  await expect(byId(page, 'food-log-0')).toContainText('Fixture lunch')
})
