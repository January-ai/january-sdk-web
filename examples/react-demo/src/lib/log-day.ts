// Calendar days are the inclusive `YYYY-MM-DD` boundaries the SDK sends for `start` and `end`.
// The API files every log under a day in the end user's IANA timezone, so every day here is a day
// in that timezone, never the browser's: the two differ for a user elsewhere, or around midnight.

/** The calendar day an instant falls on in `timeZone`. */
export function dayIn(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: usableZone(timeZone), year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant)
}

export function todayIn(timeZone: string, now = new Date()): string {
  return dayIn(now, timeZone)
}

/** Moves a `YYYY-MM-DD` day by whole calendar days. */
export function shiftDay(day: string, days: number): string {
  const [year, month, date] = parts(day)
  return isoDay(new Date(Date.UTC(year, month - 1, date + days)))
}

/**
 * When something logged on the Tracking day happened: now for today, noon in the user's timezone for
 * any other day, so the entry lands on the day being viewed rather than on today.
 */
export function timestampForDay(day: string, timeZone: string, now = new Date()): string {
  if (day === todayIn(timeZone, now)) return now.toISOString()
  return noonIn(day, timeZone).toISOString()
}

export function formatDay(day: string, timeZone: string, now = new Date()): string {
  const today = todayIn(timeZone, now)
  if (day === today) return 'Today'
  if (day === shiftDay(today, -1)) return 'Yesterday'
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(utcNoon(day))
}

/** A day's date spelled out, e.g. "Aug 25, 2026". */
export function formatShortDay(day: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(utcNoon(day))
}

/** Day of the week, 0 for Sunday. */
export function weekday(day: string): number {
  return utcNoon(day).getUTCDay()
}

/** The first day of the month `months` away from `day`'s month. */
export function firstOfMonth(day: string, months = 0): string {
  const [year, month] = parts(day)
  return isoDay(new Date(Date.UTC(year, month - 1 + months, 1)))
}

/** Intl options that show a time on the end user's clock (the browser's when the name isn't valid). */
export function zoneOption(timeZone: string): { timeZone?: string } {
  const zone = usableZone(timeZone)
  return zone ? { timeZone: zone } : {}
}

/** A timezone the browser can use: the user's when it is a valid IANA name, else the browser's own. */
function usableZone(timeZone: string): string | undefined {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return timeZone
  } catch {
    return undefined
  }
}

function noonIn(day: string, timeZone: string): Date {
  const guess = utcNoon(day)
  // How far the zone's wall clock runs from UTC at that moment; noon never falls in a DST gap.
  const offset = wallClockAsUtc(guess, timeZone) - guess.getTime()
  return new Date(guess.getTime() - offset)
}

function wallClockAsUtc(instant: Date, timeZone: string): number {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: usableZone(timeZone), hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(instant).map(({ type, value }) => [type, Number(value)]))
  return Date.UTC(values.year!, values.month! - 1, values.day!, values.hour!, values.minute!, values.second!)
}

function utcNoon(day: string): Date {
  const [year, month, date] = parts(day)
  return new Date(Date.UTC(year, month - 1, date, 12))
}

function parts(day: string): [number, number, number] {
  const [year, month, date] = day.split('-').map(Number)
  return [year!, month!, date!]
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}
