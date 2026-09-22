/** A local calendar day as the inclusive `YYYY-MM-DD` boundary the SDK sends for both `start` and `end`. */
export function localDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function todayLocalDate(now = new Date()): string {
  return localDate(now)
}

/** Moves a `YYYY-MM-DD` day by whole days in local time. */
export function shiftDay(day: string, days: number): string {
  const date = dayAtNoon(day)
  date.setDate(date.getDate() + days)
  return localDate(date)
}

export function formatDay(day: string, now = new Date()): string {
  if (day === localDate(now)) return 'Today'
  if (day === shiftDay(localDate(now), -1)) return 'Yesterday'
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }).format(dayAtNoon(day))
}

function dayAtNoon(day: string): Date {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year!, month! - 1, date!, 12)
}
