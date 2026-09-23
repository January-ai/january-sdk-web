import { expect, test } from './fixtures'
import { byId, fixtureRequests, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Switching units converts the typed amount instead of relabeling it', async ({ page }) => {
  await openDemo(page, '/tracking')
  await expect(byId(page, 'settings-user-id')).toContainText('fixture-user')

  // 250 ml typed, then fl oz picked: the amount becomes 8.5 fl oz, not 250 fl oz.
  await byId(page, 'water-unit-ml').click()
  await byId(page, 'water-amount').fill('250')
  await byId(page, 'water-unit-fl-oz').click()
  await expect(byId(page, 'water-amount')).toHaveValue('8.5')
  await byId(page, 'water-log-add').click()
  await expect(byId(page, 'water-log-last')).toContainText('Logged 8.5 fl oz')

  // 70 kg typed, then lb picked: 154.3 lb is what gets logged.
  await byId(page, 'weight-unit-kg').click()
  await byId(page, 'weight-value').fill('70')
  await byId(page, 'weight-unit-lb').click()
  await expect(byId(page, 'weight-value')).toHaveValue('154.3')
  await byId(page, 'weight-log-add').click()
  await expect(byId(page, 'weight-log-last')).toContainText('Logged 154.3 lb')

  const posts = (await fixtureRequests()).filter(({ method }) => method === 'POST')
  expect(posts.find(({ path }) => path === '/v1.2/water-logs')?.body?.amount).toEqual({ value: 8.5, unit: 'fl_oz' })
  expect(posts.find(({ path }) => path === '/v1.2/weight-logs')?.body?.weight).toEqual({ value: 154.3, unit: 'lb' })
})
