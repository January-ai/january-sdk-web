import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ChartRange, chunkDateRange, convertWeight, dailyBars, daysIn, mergeDailyItems, monthlyBars,
  niceCeiling, resolveChartRange, waterSummary, weightPoints, weightSummary,
} from './tracking-charts.ts'

const september22 = new Date(2026, 8, 22, 9)

test('every range ends today and covers 7 days, 30 days or 12 calendar months', () => {
  assert.deepEqual(resolveChartRange(ChartRange.week, september22), { start: '2026-09-16', end: '2026-09-22' })
  assert.deepEqual(resolveChartRange(ChartRange.month, september22), { start: '2026-08-24', end: '2026-09-22' })
  assert.deepEqual(resolveChartRange(ChartRange.year, september22), { start: '2025-10-01', end: '2026-09-22' })
  assert.equal(daysIn(resolveChartRange(ChartRange.week, september22)).length, 7)
  assert.equal(daysIn(resolveChartRange(ChartRange.month, september22)).length, 30)
})

test('ranges cross month and year boundaries in local time', () => {
  const january3 = new Date(2026, 0, 3, 23, 30)
  assert.deepEqual(resolveChartRange(ChartRange.week, january3), { start: '2025-12-28', end: '2026-01-03' })
  assert.deepEqual(resolveChartRange(ChartRange.year, january3), { start: '2025-02-01', end: '2026-01-03' })
})

test('a year splits into consecutive chunks of at most 90 days with no gap or overlap', () => {
  const year = resolveChartRange(ChartRange.year, september22)
  const chunks = chunkDateRange(year)
  assert.deepEqual(chunks, [
    { start: '2025-10-01', end: '2025-12-29' },
    { start: '2025-12-30', end: '2026-03-29' },
    { start: '2026-03-30', end: '2026-06-27' },
    { start: '2026-06-28', end: '2026-09-22' },
  ])
  assert.deepEqual(chunks.flatMap(daysIn), daysIn(year))
  assert.ok(chunks.every((chunk) => daysIn(chunk).length <= 90))
  // A full 365-day span needs a fifth request.
  assert.equal(chunkDateRange({ start: '2025-09-23', end: '2026-09-22' }).length, 5)
})

test('a week or a month is one request', () => {
  assert.equal(chunkDateRange(resolveChartRange(ChartRange.week, september22)).length, 1)
  assert.equal(chunkDateRange(resolveChartRange(ChartRange.month, september22)).length, 1)
  assert.deepEqual(chunkDateRange({ start: '2026-09-22', end: '2026-09-22' }), [{ start: '2026-09-22', end: '2026-09-22' }])
})

test('merging chunk answers keeps one item per date, oldest first', () => {
  const merged = mergeDailyItems([
    [{ date: '2026-09-02', v: 1 }, { date: '2026-09-01', v: 1 }],
    [{ date: '2026-09-02', v: 2 }, { date: '2026-09-03', v: 2 }],
  ])
  assert.deepEqual(merged, [{ date: '2026-09-01', v: 1 }, { date: '2026-09-02', v: 2 }, { date: '2026-09-03', v: 2 }])
})

test('days with no water are empty slots', () => {
  const bars = dailyBars([{ date: '2026-09-18', total: { value: 24 } }], { start: '2026-09-16', end: '2026-09-18' })
  assert.deepEqual(bars.map(({ start, value, logged }) => [start, value, logged]), [
    ['2026-09-16', 0, false], ['2026-09-17', 0, false], ['2026-09-18', 24, true],
  ])
})

test('the year view sums daily totals per calendar month', () => {
  const range = resolveChartRange(ChartRange.year, september22)
  const bars = monthlyBars([
    { date: '2025-10-01', total: { value: 10 } },
    { date: '2025-10-31', total: { value: 5.5 } },
    { date: '2026-02-28', total: { value: 0.1 } },
    { date: '2026-02-01', total: { value: 0.2 } },
    { date: '2026-09-22', total: { value: 24 } },
    { date: '2025-09-30', total: { value: 99 } },
  ], range)
  assert.equal(bars.length, 12)
  assert.equal(bars[0]!.key, '2025-10')
  assert.equal(bars.at(-1)!.key, '2026-09')
  assert.deepEqual(bars.filter((bar) => bar.logged).map(({ key, value }) => [key, value]), [
    ['2025-10', 15.5], ['2026-02', 0.3], ['2026-09', 24],
  ])
  assert.equal(bars.find((bar) => bar.key === '2026-01')!.value, 0)
})

test('weights convert between kg and lb for display only', () => {
  assert.equal(convertWeight(1, 'lb', 'kg'), 0.45359237)
  assert.ok(Math.abs(convertWeight(70, 'kg', 'lb') - 154.3236) < 1e-4)
  assert.equal(convertWeight(150, 'lb', 'lb'), 150)
  assert.equal(convertWeight(9, 'stone', 'kg'), 9)
  const points = weightPoints([
    { date: '2026-09-21', weight: { value: 154.3, unit: 'lb' } },
    { date: '2026-09-20', weight: { value: 70, unit: 'kg' } },
    { date: '2026-08-01', weight: { value: 71, unit: 'kg' } },
  ], { start: '2026-09-16', end: '2026-09-22' }, 'kg')
  assert.deepEqual(points.map(({ date, value }) => [date, Math.round(value * 100) / 100]), [['2026-09-20', 70], ['2026-09-21', 69.99]])
})

test('chart summaries read as sentences', () => {
  assert.equal(
    weightSummary([{ date: '2026-09-16', value: 70.2 }, { date: '2026-09-18', value: 70.4 }, { date: '2026-09-22', value: 69.8 }], ChartRange.week, 'kg'),
    'Weight, last 7 days: 3 entries, from 70.2 kg to 69.8 kg, lowest 69.8 kg, highest 70.4 kg',
  )
  assert.equal(weightSummary([], ChartRange.month, 'lb'), 'Weight, last 30 days: no entries')
  const bars = dailyBars([{ date: '2026-09-19', total: { value: 32 } }, { date: '2026-09-22', total: { value: 24 } }], resolveChartRange(ChartRange.week, september22))
  assert.equal(waterSummary(bars, ChartRange.week, 'fl oz'), 'Water, last 7 days: 2 of 7 days logged, 56 fl oz in total, most 32 fl oz on Sat, Sep 19')
})

test('axis ceilings are round numbers', () => {
  assert.equal(niceCeiling(0), 1)
  assert.equal(niceCeiling(32), 50)
  assert.equal(niceCeiling(24), 25)
  assert.equal(niceCeiling(709.8), 1000)
  assert.equal(niceCeiling(3), 5)
  assert.equal(niceCeiling(180), 200)
})
