import { localDate, shiftDay } from './log-day.ts'
import { kilogramsToPounds, poundsToKilograms } from './weight-units.ts'

/** The Tracking charts' ranges. Each one ends today, whatever day the Tracking picker shows. */
export const ChartRange = { week: 'week', month: 'month', year: 'year' } as const
export type ChartRange = (typeof ChartRange)[keyof typeof ChartRange]

export interface DateRange { start: string; end: string }

/** The longest span one list request asks for: the API answers with at most 100 days. */
export const maxDaysPerRequest = 90

export const rangePhrase: Record<ChartRange, string> = {
  week: 'last 7 days',
  month: 'last 30 days',
  year: 'last 12 months',
}

/**
 * The inclusive local dates a range covers. Week is the last 7 days and Month the last 30,
 * both including today; Year is the last 12 calendar months, from the first of the month
 * eleven months back through today.
 */
export function resolveChartRange(range: ChartRange, now = new Date()): DateRange {
  const end = localDate(now)
  if (range === ChartRange.week) return { start: shiftDay(end, -6), end }
  if (range === ChartRange.month) return { start: shiftDay(end, -29), end }
  return { start: localDate(new Date(now.getFullYear(), now.getMonth() - 11, 1, 12)), end }
}

/** Every local date from `start` through `end`, inclusive. */
export function daysIn({ start, end }: DateRange): string[] {
  const days: string[] = []
  for (let day = start; day <= end; day = shiftDay(day, 1)) days.push(day)
  return days
}

/** Splits a range into consecutive, non-overlapping pieces of at most `maxDays` days, oldest first. */
export function chunkDateRange(range: DateRange, maxDays = maxDaysPerRequest): DateRange[] {
  if (maxDays < 1) throw new RangeError('maxDays must be at least 1')
  const chunks: DateRange[] = []
  let start = range.start
  while (start <= range.end) {
    const last = shiftDay(start, maxDays - 1)
    const end = last < range.end ? last : range.end
    chunks.push({ start, end })
    start = shiftDay(end, 1)
  }
  return chunks
}

/** Joins the answers of the chunked requests into one list, one item per date, oldest first. */
export function mergeDailyItems<T extends { date: string }>(pages: readonly (readonly T[])[]): T[] {
  const byDate = new Map<string, T>()
  for (const items of pages) for (const item of items) byDate.set(item.date, item)
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export interface ChartBar { key: string; start: string; value: number; logged: boolean }

/** One bar per day of the range; a day with nothing logged is an empty slot with value 0. */
export function dailyBars(items: readonly { date: string; total: { value: number } }[], range: DateRange): ChartBar[] {
  const totals = new Map(items.map((item) => [item.date, item.total.value]))
  return daysIn(range).map((day) => ({ key: day, start: day, value: totals.get(day) ?? 0, logged: totals.has(day) }))
}

/** One bar per calendar month the range touches, each the sum of that month's daily totals. */
export function monthlyBars(items: readonly { date: string; total: { value: number } }[], range: DateRange): ChartBar[] {
  const bars = new Map<string, ChartBar>()
  for (let month = range.start.slice(0, 7); month <= range.end.slice(0, 7); month = nextMonth(month)) {
    bars.set(month, { key: month, start: `${month}-01`, value: 0, logged: false })
  }
  for (const item of items) {
    if (item.date < range.start || item.date > range.end) continue
    const bar = bars.get(item.date.slice(0, 7))
    if (!bar) continue
    bar.value += item.total.value
    bar.logged = true
  }
  return [...bars.values()].map((bar) => ({ ...bar, value: roundTo(bar.value, 3) }))
}

function nextMonth(month: string): string {
  const [year, index] = month.split('-').map(Number)
  const date = new Date(year!, index!, 1, 12)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** Converts a weight between `kg` and `lb`. A unit it does not know is returned unchanged. */
export function convertWeight(value: number, from: string, to: string): number {
  if (from === to) return value
  if (from === 'lb' && to === 'kg') return poundsToKilograms(value)
  if (from === 'kg' && to === 'lb') return kilogramsToPounds(value)
  return value
}

export interface WeightPoint { date: string; value: number }

/** The range's daily weights, each converted to `unit` for display, oldest first. */
export function weightPoints(items: readonly { date: string; weight: { value: number; unit: string } }[], range: DateRange, unit: string): WeightPoint[] {
  return items
    .filter((item) => item.date >= range.start && item.date <= range.end)
    .map((item) => ({ date: item.date, value: convertWeight(item.weight.value, item.weight.unit, unit) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Whole days from `start` to `day`, for placing a date on a time axis. */
export function dayOffset(start: string, day: string): number {
  return Math.round((noon(day).getTime() - noon(start).getTime()) / 86_400_000)
}

function noon(day: string): Date {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year!, month! - 1, date!, 12)
}

export function formatChartValue(value: number, digits = 1): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value)
}

export function formatChartDate(day: string, style: 'weekday' | 'day' | 'month' | 'monthYear' | 'full'): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: { weekday: 'short' },
    day: { month: 'short', day: 'numeric' },
    month: { month: 'short' },
    monthYear: { month: 'short', year: 'numeric' },
    full: { weekday: 'short', month: 'short', day: 'numeric' },
  }[style] as Intl.DateTimeFormatOptions
  return new Intl.DateTimeFormat('en-US', options).format(noon(day))
}

/** The screen-reader summary of the weight line, e.g. "Weight, last 7 days: 3 entries, from 70.2 kg to 69.8 kg". */
export function weightSummary(points: readonly WeightPoint[], range: ChartRange, unit: string): string {
  const prefix = `Weight, ${rangePhrase[range]}`
  if (!points.length) return `${prefix}: no entries`
  const first = points[0]!
  const last = points.at(-1)!
  if (points.length === 1) return `${prefix}: 1 entry, ${formatChartValue(first.value)} ${unit}`
  const low = Math.min(...points.map((point) => point.value))
  const high = Math.max(...points.map((point) => point.value))
  return `${prefix}: ${points.length} entries, from ${formatChartValue(first.value)} ${unit} to ${formatChartValue(last.value)} ${unit}, lowest ${formatChartValue(low)} ${unit}, highest ${formatChartValue(high)} ${unit}`
}

/** The screen-reader summary of the water bars, e.g. "Water, last 7 days: 5 of 7 days logged, 120 fl oz in total, most 32 fl oz on Sat, Sep 19". */
export function waterSummary(bars: readonly ChartBar[], range: ChartRange, unit: string): string {
  const prefix = `Water, ${rangePhrase[range]}`
  const logged = bars.filter((bar) => bar.logged)
  if (!logged.length) return `${prefix}: nothing logged`
  const total = roundTo(bars.reduce((sum, bar) => sum + bar.value, 0), 3)
  const most = logged.reduce((best, bar) => (bar.value > best.value ? bar : best), logged[0]!)
  const period = range === ChartRange.year ? 'months' : 'days'
  const when = range === ChartRange.year ? formatChartDate(most.start, 'monthYear') : formatChartDate(most.start, 'full')
  return `${prefix}: ${logged.length} of ${bars.length} ${period} logged, ${formatChartValue(total)} ${unit} in total, most ${formatChartValue(most.value)} ${unit} ${range === ChartRange.year ? 'in' : 'on'} ${when}`
}

/** A round axis maximum at or above `value`: 1, 2, 2.5 or 5 times a power of ten. */
export function niceCeiling(value: number): number {
  if (!(value > 0)) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find((factor) => factor * power >= value) ?? 10
  return roundTo(step * power, 6)
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
