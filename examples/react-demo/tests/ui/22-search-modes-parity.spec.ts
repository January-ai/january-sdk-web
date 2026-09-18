import { expect, test } from '@playwright/test'
import { byId, control, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Native parity - description, barcode, and autocomplete', async ({ page }) => {
  await openDemo(page, '/scan')
  await byId(page, 'scan-mode-description').click()
  await byId(page, 'description-input').fill('a bowl of oatmeal with honey and a banana')
  await byId(page, 'description-submit').click()
  await expect(byId(page, 'description-results')).toContainText('Fixture meal')

  await byId(page, 'scan-mode-barcode').click()
  await byId(page, 'barcode-input').fill('012345678905')
  await byId(page, 'barcode-submit').click()
  await expect(page.getByText('Fixture Pizza')).toBeVisible()

  await openDemo(page, '/search')
  await byId(page, 'search-input').fill('pi')
  await expect(byId(page, 'autocomplete-suggestions')).toBeVisible()
  await byId(page, 'autocomplete-result-0').click()
  await expect(byId(page, 'food-result-0')).toBeVisible()
})
