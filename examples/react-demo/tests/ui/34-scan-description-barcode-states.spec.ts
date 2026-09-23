import { expect, test } from './fixtures'
import { stubBarcodeCamera } from './device-stubs'
import { byId, control, fixtureRequests, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Description prompt, failure, loading, and a correction', async ({ page }) => {
  await openDemo(page, '/scan')
  await byId(page, 'scan-mode-description').click()
  await expect(byId(page, 'description-prompt')).toBeVisible()
  await expect(byId(page, 'description-submit')).toBeDisabled()

  await control('/v1.2/food-analysis/text', { status: 500 })
  await byId(page, 'description-input').fill('two scrambled eggs')
  await byId(page, 'description-submit').click()
  await expect(byId(page, 'description-error')).toBeVisible()
  await expect(byId(page, 'description-input')).toHaveValue('two scrambled eggs')

  await control('/v1.2/food-analysis/text', { delay: 2 })
  await byId(page, 'description-submit').click()
  await expect(byId(page, 'description-loading')).toBeVisible()
  await expect(byId(page, 'description-results')).toContainText('Fixture meal', { timeout: 15_000 })
  const analysis = (await fixtureRequests()).filter(({ path }) => path === '/v1.2/food-analysis/text').at(-1)
  expect(analysis?.body).toEqual({ text: 'two scrambled eggs' })

  await byId(page, 'scan-correct').click()
  await byId(page, 'scan-correction-input').fill('It was three eggs.')
  await byId(page, 'scan-correction-submit').click()
  await expect(byId(page, 'description-results')).toContainText('Corrected Fixture meal')
  await expect(byId(page, 'scan-corrected')).toBeVisible()
})

test('UPC prompt, loading, a match, and an unknown UPC', async ({ page }) => {
  await control('/v1.2/foods/barcode/012345678905', { delay: 2 })
  await openDemo(page, '/scan')
  await byId(page, 'scan-mode-barcode').click()
  await expect(byId(page, 'barcode-prompt')).toBeVisible()
  // Only digits are kept.
  await byId(page, 'barcode-input').fill('0123-4567-8905')
  await expect(byId(page, 'barcode-input')).toHaveValue('012345678905')
  await byId(page, 'barcode-submit').click()
  await expect(byId(page, 'barcode-loading')).toBeVisible()
  await expect(byId(page, 'food-result-0')).toContainText('Fixture Pizza', { timeout: 15_000 })

  await byId(page, 'barcode-input').fill('000000000000')
  await byId(page, 'barcode-submit').click()
  await expect(byId(page, 'empty-results')).toContainText('No match found')
  await expect(byId(page, 'search-error')).toHaveCount(0)
})

test('The camera reads a barcode into the UPC field', async ({ page }) => {
  await stubBarcodeCamera(page, { barcode: '012345678905', afterMs: 1_000 })
  await openDemo(page, '/scan')
  await byId(page, 'scan-mode-barcode').click()
  await byId(page, 'scan-barcode-button').click()
  await expect(byId(page, 'scan-barcode-camera')).toBeVisible()
  await expect(byId(page, 'scan-barcode-button')).toHaveText('Stop camera')
  await expect(byId(page, 'barcode-input')).toHaveValue('012345678905', { timeout: 10_000 })
  await expect(byId(page, 'scan-barcode-camera')).toBeHidden()
  await byId(page, 'barcode-submit').click()
  await byId(page, 'food-result-0').click()
  await expect(page).toHaveURL(/\/food\/food-1\?.*upc=012345678905/)
  await byId(page, 'food-detail-back').click()
  await expect(byId(page, 'scan-screen')).toBeVisible()
})

test('Stopping the camera before it reads a barcode', async ({ page }) => {
  await stubBarcodeCamera(page, { barcode: null })
  await openDemo(page, '/scan')
  await byId(page, 'scan-mode-barcode').click()
  await byId(page, 'scan-barcode-button').click()
  await expect(byId(page, 'scan-barcode-camera')).toBeVisible()
  await byId(page, 'scan-barcode-button').click()
  await expect(byId(page, 'scan-barcode-camera')).toBeHidden()
  await expect(byId(page, 'scan-barcode-button')).toHaveText('Scan barcode with camera')
  await expect(byId(page, 'barcode-input')).toHaveValue('')
})

test('A blocked camera falls back to typing the UPC', async ({ page }) => {
  await stubBarcodeCamera(page, { camera: 'denied' })
  await openDemo(page, '/scan')
  await byId(page, 'scan-mode-barcode').click()
  await byId(page, 'scan-barcode-button').click()
  await expect(byId(page, 'scan-barcode-error')).toContainText('Enter the UPC below instead')
  await expect(byId(page, 'scan-barcode-camera')).toBeHidden()
})

test('Without live barcode detection the camera is not offered', async ({ page }) => {
  await stubBarcodeCamera(page, { detector: false })
  await openDemo(page, '/scan')
  await byId(page, 'scan-mode-barcode').click()
  await expect(byId(page, 'scan-barcode-unsupported')).toBeVisible()
  await expect(byId(page, 'scan-barcode-button')).toHaveCount(0)
  await expect(byId(page, 'barcode-input')).toBeEnabled()
})
