import { expect, test } from '@playwright/test'
import { byId, control, fixtureRequests, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Glucose prompt, profile, food suggestions, loading, and choosing again', async ({ page }) => {
  await openDemo(page, '/glucose')
  await expect(byId(page, 'glucose-prompt')).toBeVisible()
  await expect(byId(page, 'glucose-predict')).toBeDisabled()
  await expect(byId(page, 'glucose-sex-female')).toHaveJSProperty('selected', true)
  await byId(page, 'glucose-sex').selectOption('male')
  await expect(byId(page, 'glucose-sex-male')).toHaveJSProperty('selected', true)
  await byId(page, 'glucose-activity').selectOption('very_active')
  await byId(page, 'glucose-height-feet').fill('6')
  await byId(page, 'glucose-height-inches').fill('1')
  await byId(page, 'glucose-weight').fill('180')

  await expect(byId(page, 'food-picker')).toBeVisible()
  await byId(page, 'food-picker-input').fill('pi')
  await expect(byId(page, 'food-picker-suggestions')).toBeVisible()
  await control('/v1.2/foods', { delay: 2 })
  await byId(page, 'food-picker-suggestion-0').click()
  await expect(byId(page, 'food-picker-loading')).toBeVisible()
  await expect(byId(page, 'food-picker-results')).toBeVisible({ timeout: 15_000 })
  await byId(page, 'food-picker-result-0').click()
  await expect(byId(page, 'glucose-food-0')).toContainText('Fixture Pizza')

  const quantity = byId(page, 'food-serving-controls')
  await quantity.getByRole('button', { name: 'Increase quantity' }).click()
  await expect(quantity).toContainText('1.25')
  await byId(page, 'food-serving-unit').selectOption('11')

  await control('/v1.2/glucose/predictions', { delay: 2 })
  await byId(page, 'glucose-predict').click()
  await expect(byId(page, 'glucose-loading')).toBeVisible()
  await expect(byId(page, 'glucose-result')).toBeVisible({ timeout: 15_000 })
  const prediction = (await fixtureRequests()).find(({ path }) => path === '/v1.2/glucose/predictions')
  expect(prediction?.body).toMatchObject({
    user_profile: { sex: 'male', activity_level: 'very_active', height: { value: 73, unit: 'in' }, weight: { value: 180, unit: 'lb' } },
    foods: [{ food_id: 'food-1', serving_id: '11', quantity: 1.25 }],
  })

  await byId(page, 'glucose-start-over').click()
  await expect(byId(page, 'glucose-food-0')).toHaveCount(0)
  await expect(byId(page, 'food-picker')).toBeVisible()
  await expect(byId(page, 'glucose-predict')).toBeDisabled()
})
