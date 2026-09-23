import { expect, test } from './fixtures'
import { stubVoiceCapture } from './device-stubs'
import { byId, openDemo, resetFixture } from './flow'

test.beforeEach(async () => {
  await resetFixture()
})

test('Voice search fills the food query and searches it', async ({ page }) => {
  await stubVoiceCapture(page, { transcript: 'banana' })
  await openDemo(page, '/search')
  await expect(byId(page, 'search-voice')).toBeEnabled()
  await byId(page, 'search-voice').click()
  await expect(byId(page, 'voice-stop')).toBeVisible()
  await byId(page, 'voice-stop').click()
  await expect(byId(page, 'search-input')).toHaveValue('banana')
  await byId(page, 'search-submit').click()
  await expect(byId(page, 'food-result-0')).toBeVisible()
})

test('Describe a meal by voice, after cancelling a first try', async ({ page }) => {
  await stubVoiceCapture(page, { transcript: 'two eggs and toast' })
  await openDemo(page, '/scan')
  await byId(page, 'scan-mode-description').click()
  await byId(page, 'description-voice').click()
  await byId(page, 'voice-cancel').click()
  await expect(byId(page, 'description-voice')).toBeVisible()
  await expect(byId(page, 'description-input')).toHaveValue('')

  await byId(page, 'description-input').fill('breakfast:')
  await byId(page, 'description-voice').click()
  await byId(page, 'voice-stop').click()
  // The transcript is added to what was typed.
  await expect(byId(page, 'description-input')).toHaveValue('breakfast: two eggs and toast')
  await byId(page, 'description-submit').click()
  await expect(byId(page, 'description-results')).toBeVisible()
})

test('Nothing heard asks to try again', async ({ page }) => {
  await stubVoiceCapture(page, { transcript: '' })
  await openDemo(page, '/search')
  await byId(page, 'search-voice').click()
  await byId(page, 'voice-stop').click()
  await expect(byId(page, 'voice-error')).toHaveText('We could not transcribe that recording. Please try again.')
  await expect(byId(page, 'search-input')).toHaveValue('')
})

test('A blocked microphone explains how to allow it', async ({ page }) => {
  await stubVoiceCapture(page, { microphone: 'denied' })
  await openDemo(page, '/search')
  await byId(page, 'search-voice').click()
  await expect(byId(page, 'voice-error')).toHaveText('Allow microphone access in your browser to search by voice.')
  await expect(byId(page, 'voice-stop')).toHaveCount(0)
})

test('Browsers without recording or transcription keep typing available', async ({ page }) => {
  await stubVoiceCapture(page, { recording: false })
  await openDemo(page, '/search')
  await expect(byId(page, 'voice-unsupported')).toBeVisible()
  await expect(byId(page, 'search-voice')).toBeDisabled()
  await expect(byId(page, 'search-input')).toBeEnabled()

  const other = await page.context().newPage()
  await stubVoiceCapture(other, { transcription: false })
  await openDemo(other, '/search')
  await expect(byId(other, 'voice-no-transcription')).toBeVisible()
  await expect(byId(other, 'search-voice')).toBeDisabled()
  await other.close()
})
