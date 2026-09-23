import { expect, test } from './fixtures'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Food picker empty error and retry', async ({ page }) => {
  await openDemo(page, '/glucose')
  await control('/v1.2/foods', { empty: true })
  await byId(page, 'food-picker-input').fill('nothing')
  await byId(page, 'glucose-add-food').click()
  await expect(byId(page, 'food-picker-empty')).toBeVisible()

  await control('/v1.2/foods', { status: 500 })
  await byId(page, 'food-picker-input').fill('broken')
  await byId(page, 'glucose-add-food').click()
  await expect(byId(page, 'food-picker-error')).toBeVisible()

  await control('/v1.2/foods', { status: 200 })
  await byId(page, 'food-picker-input').fill('pizza')
  await byId(page, 'glucose-add-food').click()
  await byId(page, 'food-picker-result-0').click()
  await expect(byId(page, 'glucose-food-0')).toContainText('Fixture Pizza')
})
