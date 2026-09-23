#!/usr/bin/env node

// Direct calls to the January API for the live suite: they check that what the demo
// shows is what the server holds, independently of the SDK. Every call is logged
// (method, path, status, body) with tokens redacted.
//
// As a script, for the same end user and the local calendar day:
//   node tests/live/live-api.mjs state [YYYY-MM-DD]   # water, weight, meals with their created_at, and totals
//   node tests/live/live-api.mjs cleanup             # delete the logs a live run created
//
// Environment: PARTNER_TOKEN_URL (the token relay; default the local relay),
// LIVE_END_USER_ID (default e2e-qa-web), PARTNER_APP_SESSION_TOKEN for a hosted relay,
// and LIVE_EVIDENCE_DIR (default test-results/live) for the logs and the created-logs ledger.

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const apiBase = 'https://partners.january.ai'
export const relayUrl = process.env.PARTNER_TOKEN_URL ?? 'http://127.0.0.1:8787/api/january/client-token'
export const endUserId = process.env.LIVE_END_USER_ID ?? 'e2e-qa-web'
export const evidenceDir = resolve(process.env.LIVE_EVIDENCE_DIR ?? 'test-results/live')
export const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

const logFile = join(evidenceDir, 'api-verification.log')
const quotaFile = join(evidenceDir, 'allowance-used-up.json')
const jsonFile = join(evidenceDir, 'api-verification.jsonl')
const ledgerFile = join(evidenceDir, 'created-logs.json')

/** Removes client tokens, API keys, and bearer values from anything written to a log. */
export function redact(text) {
  return String(text)
    .replace(/Bearer\s+[^\s"'\\]+/gi, 'Bearer <redacted>')
    .replace(/\b(ct|sk)-[A-Za-z0-9._~+/=-]{8,}/g, '$1-<redacted>')
    .replace(/("token"\s*:\s*")[^"]+"/g, '$1<redacted>"')
}

/** A local calendar day as `YYYY-MM-DD`, `offsetDays` from today. */
export function localDay(offsetDays = 0, now = new Date()) {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays, 12)
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
}

let context = ''
/** Labels the calls that follow in the log, e.g. the live step that made them. */
export function setLogContext(label) { context = label }

function record(entry) {
  mkdirSync(evidenceDir, { recursive: true })
  const line = { time: new Date().toISOString(), context, ...entry }
  appendFileSync(jsonFile, `${redact(JSON.stringify(line))}\n`)
  const body = entry.responseBody === undefined ? '' : JSON.stringify(entry.responseBody)
  const sent = entry.requestBody === undefined ? '' : ` sent ${JSON.stringify(entry.requestBody)}`
  appendFileSync(logFile, `${redact(`${line.time} [${context}] ${entry.method} ${entry.path} -> ${entry.status}${sent}\n    ${body.length > 4000 ? `${body.slice(0, 4000)}… (${body.length} chars)` : body}`)}\n`)
}

let cachedToken
async function clientToken() {
  if (cachedToken && cachedToken.expiresAt - Date.now() > 120_000) return cachedToken.value
  const sessionToken = process.env.PARTNER_APP_SESSION_TOKEN?.trim()
  const response = await fetch(relayUrl, {
    method: 'POST',
    headers: { 'January-End-User-ID': endUserId, ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}) },
  })
  const body = await response.json().catch(() => null)
  record({ method: 'POST', path: new URL(relayUrl).pathname, status: response.status, requestBody: { headers: { 'January-End-User-ID': endUserId } }, responseBody: body && { ...body, token: body.token ? '<redacted>' : body.token } })
  if (!response.ok || typeof body?.token !== 'string') throw new Error(`The token relay answered ${response.status}.`)
  const expiresIn = body.expires_in ?? body.expiresIn
  cachedToken = { value: body.token, expiresAt: Date.now() + expiresIn * 1_000 }
  return cachedToken.value
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

/**
 * When the account's rolling 24-hour allowance is used up, the API's message and when it
 * reopens; null otherwise. The live suite skips what is left instead of retrying into it.
 */
export function allowanceUsedUp() {
  return existsSync(quotaFile) ? JSON.parse(readFileSync(quotaFile, 'utf8')) : null
}

/**
 * One API call as the live end user. Resolves with the status and parsed body; never throws
 * on an HTTP error. The API allows 60 requests a minute per end user, counting the demo's own
 * requests, so a 429 for that waits for the minute to reset and asks again. A 429 for the
 * account's rolling 24-hour allowance (a Retry-After of hours) is returned at once and noted,
 * because retrying cannot help until the window reopens.
 */
export async function api(method, path, requestBody) {
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(`${apiBase}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${await clientToken()}`,
        Accept: 'application/json',
        ...(requestBody === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: requestBody === undefined ? undefined : JSON.stringify(requestBody),
    })
    const text = await response.text()
    let responseBody = null
    try { responseBody = text ? JSON.parse(text) : null } catch { responseBody = text }
    record({ method, path, status: response.status, requestBody, responseBody })
    if (response.status !== 429 || attempt === 5) return { status: response.status, body: responseBody }
    const retryAfter = Number(response.headers.get('retry-after'))
    if (Number.isFinite(retryAfter) && retryAfter > 120) {
      mkdirSync(evidenceDir, { recursive: true })
      writeFileSync(quotaFile, `${JSON.stringify({ at: new Date().toISOString(), retryAfterSeconds: retryAfter, message: responseBody?.message ?? null }, null, 2)}\n`)
      return { status: response.status, body: responseBody }
    }
    await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1_000 + 500 : 20_000)
  }
}

const query = (values) => new URLSearchParams(Object.entries(values).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)])).toString()

async function ok(method, path, requestBody) {
  const result = await api(method, path, requestBody)
  if (result.status >= 400) throw new Error(`${method} ${path} answered ${result.status}: ${JSON.stringify(result.body)}`)
  return result.body
}

/** Daily water totals from `start` through `end` in `unit` (`fl_oz`, `ml`, or `cup`). */
export async function waterTotals(start, end, unit) {
  return (await ok('GET', `/v1.2/water-logs?${query({ start_date: start, end_date: end, timezone, unit })}`)).items
}

/** The day's water total in `unit`, 0 when nothing is logged. */
export async function waterTotal(day, unit) {
  const items = await waterTotals(day, day, unit)
  return items.find((item) => item.date === day)?.total.value ?? 0
}

export async function weights(start, end) {
  return (await ok('GET', `/v1.2/weight-logs?${query({ start_date: start, end_date: end, timezone })}`)).items
}

/** The day's latest weight as `{ value, unit }`, or null. */
export async function weightOn(day) {
  return (await weights(day, day)).find((item) => item.date === day)?.weight ?? null
}

export async function foodLogs(start, end = start) {
  return (await ok('GET', `/v1.2/food-logs?${query({ start_date: start, end_date: end, timezone })}`)).items
}

export async function foodLog(logId) {
  return api('GET', `/v1.2/food-logs/${encodeURIComponent(logId)}`)
}

export async function foodLogSummary(day) {
  return ok('GET', `/v1.2/food-logs/summary?${query({ start_date: day, end_date: day, timezone, group_by: 'day', week_start: 'monday' })}`)
}

export async function deleteWaterLog(logId) {
  return api('DELETE', `/v1.2/water-logs/${encodeURIComponent(logId)}`)
}

export async function deleteFoodLog(logId) {
  return api('DELETE', `/v1.2/food-logs/${encodeURIComponent(logId)}`)
}

function readLedger() {
  return existsSync(ledgerFile) ? JSON.parse(readFileSync(ledgerFile, 'utf8')) : { endUserId, water: [], food: [] }
}

/** Remembers a log the live run created, so cleanup can delete it even after a failure. */
export function rememberCreated(kind, logId, note = '') {
  mkdirSync(evidenceDir, { recursive: true })
  const ledger = readLedger()
  if (!ledger[kind].some((entry) => entry.id === logId)) ledger[kind].push({ id: logId, note, at: new Date().toISOString() })
  writeFileSync(ledgerFile, `${JSON.stringify(ledger, null, 2)}\n`)
}

/** Deletes every water and food log in the ledger. Weight logs have no delete in the API. */
export async function cleanup() {
  const ledger = readLedger()
  const results = []
  for (const entry of ledger.water) results.push({ kind: 'water', id: entry.id, status: (await deleteWaterLog(entry.id)).status })
  for (const entry of ledger.food) results.push({ kind: 'food', id: entry.id, status: (await deleteFoodLog(entry.id)).status })
  writeFileSync(ledgerFile, `${JSON.stringify({ ...ledger, cleanedUpAt: new Date().toISOString(), results }, null, 2)}\n`)
  return results
}

/** The end user's logs for one day, as the demo's Tracking screen would show them. */
export async function state(day = localDay()) {
  const [flOz, ml, cup, weight, meals, summary] = [
    await waterTotal(day, 'fl_oz'), await waterTotal(day, 'ml'), await waterTotal(day, 'cup'), await weightOn(day), await foodLogs(day), await foodLogSummary(day),
  ]
  return {
    endUserId,
    timezone,
    day,
    water: { fl_oz: flOz, ml, cup },
    weight,
    meals: meals.map((log) => ({ id: log.id, name: log.name, createdAt: log.created_at, foods: log.foods.map((food) => `${food.quantity} × ${food.name}`) })),
    totals: summary.totals,
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  setLogContext(`cli ${process.argv.slice(2).join(' ')}`)
  const [command = 'state', day] = process.argv.slice(2)
  if (command === 'state') console.log(JSON.stringify(await state(day), null, 2))
  else if (command === 'cleanup') console.log(JSON.stringify(await cleanup(), null, 2))
  else {
    console.error('Usage: node tests/live/live-api.mjs state [YYYY-MM-DD] | cleanup')
    process.exitCode = 1
  }
}
