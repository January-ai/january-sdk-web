import { expect, test, type Locator, type Page } from '@playwright/test'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { evidenceDir, setLogContext } from './live-api.mjs'

/**
 * Evidence for the live suite, under LIVE_EVIDENCE_DIR: a screenshot for every step
 * (`screenshots/NNN-feature-step.png`), and `steps.jsonl` with each step's feature,
 * result, screenshot, and what it compared between the demo and the API.
 */

mkdirSync(join(evidenceDir, 'screenshots'), { recursive: true })

// Numbering continues across worker restarts (Playwright starts a new worker after a failure).
const stepsFile = join(evidenceDir, 'steps.jsonl')
let index = existsSync(stepsFile)
  ? Math.max(0, ...readFileSync(stepsFile, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line).index ?? 0))
  : 0
let current: { feature: string; step: string } | null = null
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

function write(entry: Record<string, unknown>) {
  appendFileSync(stepsFile, `${JSON.stringify({ time: new Date().toISOString(), ...entry })}\n`)
}

/**
 * Runs one step of a live flow as a Playwright step, then screenshots the page (scrolled
 * to `focus` when given) whether it passed or failed.
 */
export async function step<T>(page: Page, feature: string, title: string, body: () => Promise<T>, focus?: () => Locator): Promise<T> {
  return test.step(`${feature} · ${title}`, async () => {
    index += 1
    const number = String(index).padStart(3, '0')
    current = { feature, step: title }
    setLogContext(`${number} ${feature}: ${title}`)
    const started = Date.now()
    let failure: unknown
    try {
      return await body()
    } catch (error) {
      failure = error
      throw error
    } finally {
      const screenshot = `screenshots/${number}-${slug(feature)}-${slug(title)}${failure ? '-FAILED' : ''}.png`
      try {
        await focus?.().scrollIntoViewIfNeeded({ timeout: 3_000 })
      } catch { /* the screenshot still shows where the page is */ }
      await page.screenshot({ path: join(evidenceDir, screenshot) }).catch(() => undefined)
      write({ index, feature, step: title, status: failure ? 'fail' : 'pass', ms: Date.now() - started, screenshot, ...(failure ? { error: String(failure).slice(0, 800) } : {}) })
      current = null
    }
  })
}

/** Records what a step compared, e.g. the demo's water total against the API's. */
export function verified(what: string, ui: unknown, server: unknown) {
  write({ index, ...current, verified: what, ui, api: server })
}

/** Records an observation that is not a comparison, such as a known backend limitation. */
export function observed(what: string, detail: unknown) {
  write({ index, ...current, observed: what, detail })
}

const windowFile = join(evidenceDir, 'rate-window.json')
/**
 * Starts a test in a fresh rate-limit window: the API allows 60 requests a minute per end
 * user, and the demo's screens and these checks share that budget. The start of the last
 * window is kept on disk so a restarted worker waits too.
 */
export async function freshRateWindow(page: Page) {
  const startedAt = existsSync(windowFile) ? JSON.parse(readFileSync(windowFile, 'utf8')).startedAt as number : 0
  const wait = startedAt + 62_000 - Date.now()
  if (wait > 0) await page.waitForTimeout(wait)
  writeFileSync(windowFile, JSON.stringify({ startedAt: Date.now() }))
}

export function byId(page: Page, id: string | RegExp): Locator {
  return page.getByTestId(id)
}

export async function openDemo(page: Page, path: string) {
  await page.goto(path)
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true')
}

/** A number as the demo formats it (en-US, at most `digits` decimals). */
export function shown(value: number, digits = 1) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value)
}
