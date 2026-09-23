import { expect, type Locator, type Page } from '@playwright/test'

/** Where the fixture server (tests/ui/fixture-server.mjs) listens. */
export const fixtureApi = 'http://127.0.0.1:18767'

/**
 * Configures how the fixture server answers one route for the rest of the test:
 * an HTTP status, an empty collection, or a delay in seconds before answering.
 */
export async function control(
  route: string,
  options: { status?: number; empty?: boolean; delay?: number } = {},
) {
  const params = new URLSearchParams({ route })
  if (options.status !== undefined) params.set('status', String(options.status))
  if (options.empty !== undefined) params.set('empty', String(options.empty))
  if (options.delay !== undefined) params.set('delay', String(options.delay))
  const response = await fetch(`${fixtureApi}/__control?${params}`)
  if (!response.ok) throw new Error(`Fixture control failed for ${route}: HTTP ${response.status}`)
}

/** Clears every rule and the recorded requests so a test never inherits another's setup. */
export async function resetFixture() {
  const response = await fetch(`${fixtureApi}/__reset`)
  if (!response.ok) throw new Error(`Fixture reset failed: HTTP ${response.status}`)
}

/** One request the fixture server received; `body` is the JSON a POST or PATCH sent. */
export interface FixtureRequest {
  method: string
  path: string
  query: Record<string, string>
  body?: any
  authorization: string | null
}

/** The requests the fixture server has received since the last reset. */
export async function fixtureRequests(): Promise<FixtureRequest[]> {
  const response = await fetch(`${fixtureApi}/__requests`)
  return (await response.json()) as FixtureRequest[]
}

/** Opens a demo route and waits until the client has hydrated. */
export async function openDemo(page: Page, path: string) {
  await page.goto(path)
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true')
}

/** Selects by the kebab-case test id shared with the React Native, iOS and Android demos. */
export function byId(page: Page, id: string): Locator {
  return page.getByTestId(id)
}

/** A local calendar day as `YYYY-MM-DD`, `offsetDays` from today (negative is earlier). */
export function localDay(offsetDays = 0): string {
  const day = new Date()
  day.setHours(12, 0, 0, 0)
  day.setDate(day.getDate() + offsetDays)
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
}
