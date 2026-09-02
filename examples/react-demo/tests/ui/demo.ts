import { expect, type Page } from '@playwright/test'

export const fixtureApi = 'http://127.0.0.1:18767'

export async function openDemo(page: Page, path: string) {
  await page.goto(path)
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true')
}
