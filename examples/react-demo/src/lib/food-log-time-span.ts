export const FoodLogTimeSpan = {
  today: 'today',
  thisWeek: 'this-week',
  lastMonth: 'last-month',
} as const

export type FoodLogTimeSpan = typeof FoodLogTimeSpan[keyof typeof FoodLogTimeSpan]

export interface FoodLogDateRange {
  start: string
  end: string
  display: string
}

export function resolveFoodLogTimeSpan(span: FoodLogTimeSpan, now = new Date()): FoodLogDateRange {
  const anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  let start: Date
  let end: Date
  if (span === FoodLogTimeSpan.today) {
    start = anchor
    end = anchor
  } else if (span === FoodLogTimeSpan.thisWeek) {
    start = addDays(anchor, -anchor.getDay())
    end = addDays(start, 6)
  } else {
    start = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1, 12)
    end = new Date(anchor.getFullYear(), anchor.getMonth(), 0, 12)
  }
  return {
    start: localDate(start),
    end: localDate(end),
    display: start.getTime() === end.getTime()
      ? formatDisplay(start)
      : `${formatDisplay(start)} – ${formatDisplay(end)}`,
  }
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function localDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function formatDisplay(date: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}
