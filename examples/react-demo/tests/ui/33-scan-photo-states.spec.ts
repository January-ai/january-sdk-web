import { expect, test } from './fixtures'
import { fileURLToPath } from 'node:url'
import { byId, control, fixtureRequests, openDemo, resetFixture } from './flow'

const sampleMeal = fileURLToPath(new URL('../../public/sample-meal.jpg', import.meta.url))

test.beforeEach(async () => {
  await resetFixture()
})

test('Photo prompt, library upload, loading, and a meal with nothing recognized', async ({ page }) => {
  await control('/v1.2/food-analysis/image', { delay: 2, empty: true })
  await openDemo(page, '/scan')
  await byId(page, 'scan-mode-description').click()
  await byId(page, 'scan-mode-photo').click()
  await expect(byId(page, 'scan-mode-photo')).toHaveAttribute('aria-selected', 'true')
  await expect(byId(page, 'scan-prompt')).toBeVisible()

  const chooser = page.waitForEvent('filechooser')
  await byId(page, 'scan-library-button').click()
  await (await chooser).setFiles(sampleMeal)
  await expect(byId(page, 'scan-preview')).toHaveAttribute('src', /^data:image\/jpeg;base64,/)
  await byId(page, 'scan-analyze').click()
  await expect(byId(page, 'scan-loading')).toBeVisible()
  await expect(byId(page, 'scan-detections-empty')).toBeVisible({ timeout: 15_000 })
  // With no sized food there is nothing to predict.
  await expect(byId(page, 'scan-glucose-predict')).toBeDisabled()
})

test('Camera capture and both file inputs take a photo', async ({ page }) => {
  await openDemo(page, '/scan')
  const chooser = page.waitForEvent('filechooser')
  await byId(page, 'scan-camera-button').click()
  const cameraChooser = await chooser
  expect(cameraChooser.isMultiple()).toBe(false)
  await cameraChooser.setFiles(sampleMeal)
  await expect(byId(page, 'scan-preview')).toBeVisible()

  await byId(page, 'scan-camera').setInputFiles(sampleMeal)
  await byId(page, 'scan-library').setInputFiles(sampleMeal)
  await byId(page, 'scan-analyze').click()
  await expect(byId(page, 'scan-results')).toContainText('Fixture photo meal')
  const scan = (await fixtureRequests()).find(({ path }) => path === '/v1.2/food-analysis/image')
  expect(scan?.body.image).toMatch(/^data:image\/jpeg;base64,/)
})

test('Correct a scan: cancel, failure, retry, loading, and the corrected meal', async ({ page }) => {
  await openDemo(page, '/scan')
  await byId(page, 'scan-sample').click()
  await byId(page, 'scan-analyze').click()
  await expect(byId(page, 'scan-detection-0')).toContainText('1 × 1 bowl')

  await byId(page, 'scan-correct').click()
  await expect(byId(page, 'scan-correction-submit')).toBeDisabled()
  await byId(page, 'scan-correction-cancel').click()
  await expect(byId(page, 'scan-correction')).toHaveCount(0)

  await byId(page, 'scan-correct').click()
  await control('/v1.2/food-analysis/corrections', { status: 500 })
  await byId(page, 'scan-correction-input').fill('It was two bowls.')
  await byId(page, 'scan-correction-submit').click()
  await expect(byId(page, 'scan-correction-error')).toBeVisible()
  await expect(byId(page, 'scan-correction-input')).toHaveValue('It was two bowls.')

  await control('/v1.2/food-analysis/corrections', { delay: 2 })
  await byId(page, 'scan-correction-retry').click()
  await expect(byId(page, 'scan-correction-loading')).toBeVisible()
  await expect(byId(page, 'scan-corrected')).toBeVisible({ timeout: 15_000 })
  await expect(byId(page, 'scan-results')).toContainText('Corrected Fixture photo meal')
  await expect(byId(page, 'scan-detection-0')).toContainText('2 × 1 bowl')
  await expect(byId(page, 'scan-correction')).toHaveCount(0)

  // The correction sends the scan back as it was returned, with the instruction.
  const corrections = (await fixtureRequests()).filter(({ path }) => path === '/v1.2/food-analysis/corrections')
  expect(corrections.at(-1)?.body).toMatchObject({
    instruction: 'It was two bowls.',
    analysis: { meal_name: 'Fixture photo meal', detections: [{ food: { id: 'food-1', quantity: 1, serving: { id: '11' } } }] },
  })

  // A second correction starts from the corrected meal.
  await byId(page, 'scan-correct').click()
  await byId(page, 'scan-correction-input').fill('Make it three.')
  await byId(page, 'scan-correction-submit').click()
  await expect(byId(page, 'scan-detection-0')).toContainText('4 × 1 bowl')
})

test('Meal glucose prediction loading, result, and failure', async ({ page }) => {
  await openDemo(page, '/scan')
  await byId(page, 'scan-sample').click()
  await byId(page, 'scan-analyze').click()
  await control('/v1.2/glucose/predictions', { delay: 2 })
  await byId(page, 'scan-glucose-predict').click()
  await expect(byId(page, 'scan-glucose-loading')).toBeVisible()
  await expect(byId(page, 'scan-glucose-result')).toContainText('Likely meal peak', { timeout: 15_000 })
  const prediction = (await fixtureRequests()).find(({ path }) => path === '/v1.2/glucose/predictions')
  expect(prediction?.body.foods).toEqual([{ food_id: 'food-1', serving_id: '11', quantity: 1 }])

  await control('/v1.2/glucose/predictions', { status: 500 })
  await byId(page, 'scan-glucose-predict').click()
  await expect(byId(page, 'scan-glucose-error')).toBeVisible()
})
