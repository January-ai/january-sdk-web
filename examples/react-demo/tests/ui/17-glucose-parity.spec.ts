import { expect, test } from './fixtures'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Native parity - glucose surfaces', async ({ page }) => {
  await openDemo(page, '/glucose')
  await byId(page, 'glucose-height-unit-metric').click()
  await expect(byId(page, 'glucose-height-centimeters')).toBeVisible()
  await byId(page, 'glucose-height-unit-imperial').click()
  await expect(byId(page, 'glucose-height-feet')).toBeVisible()
  await expect(byId(page, 'glucose-height-inches')).toBeVisible()
  await byId(page, 'glucose-weight-unit-kg').click()
  await expect(byId(page, 'glucose-weight')).toBeVisible()
  await byId(page, 'glucose-weight-unit-lb').click()
  await byId(page, 'glucose-sex').selectOption({ label: 'Male' })
  await byId(page, 'food-picker-input').fill('pizza')
  await byId(page, 'glucose-add-food').click()
  await byId(page, 'food-picker-result-0').click()
  await expect(byId(page, 'glucose-food-0')).toContainText('Fixture Pizza')
  await byId(page, 'glucose-predict').click()
  await expect(byId(page, 'glucose-results-screen')).toBeVisible()
  await expect(byId(page, 'glucose-chart')).toBeVisible()
  await expect(page.getByText('Likely peak').first()).toBeVisible()
  await expect(byId(page, 'glucose-result')).toContainText('Likely peak')
  await expect(byId(page, 'glucose-food-0')).toContainText('Fixture Pizza')
})
