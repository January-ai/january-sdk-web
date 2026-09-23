import { firstOfMonth, formatShortDay, shiftDay, todayIn, weekday } from './log-day.ts'

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

/** The inclusive dates a span covers, in the end user's timezone. */
export function resolveFoodLogTimeSpan(span: FoodLogTimeSpan, timeZone: string, now = new Date()): FoodLogDateRange {
  const today = todayIn(timeZone, now)
  let start: string
  let end: string
  if (span === FoodLogTimeSpan.today) {
    start = today
    end = today
  } else if (span === FoodLogTimeSpan.thisWeek) {
    start = shiftDay(today, -weekday(today))
    end = shiftDay(start, 6)
  } else {
    start = firstOfMonth(today, -1)
    end = shiftDay(firstOfMonth(today), -1)
  }
  return {
    start,
    end,
    display: start === end ? formatShortDay(start) : `${formatShortDay(start)} – ${formatShortDay(end)}`,
  }
}
