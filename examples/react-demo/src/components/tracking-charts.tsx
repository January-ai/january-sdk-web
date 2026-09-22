import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ErrorMessage } from '~/components/ui'
import {
  ChartRange, dayOffset, daysIn, formatChartDate, formatChartValue, niceCeiling, rangePhrase,
  waterSummary, weightSummary, type ChartBar, type DateRange, type WeightPoint,
} from '~/lib/tracking-charts'
import { cn } from '~/lib/utils'

const chartHeight = 220
const plot = { top: 18, right: 14, bottom: 30, left: 48 }
const ink = { muted: '#78716c', grid: '#e7e5e4', surface: '#ffffff' }
const weightColor = '#a8502f'
const waterColor = '#3f6f8f'
const waterSlot = '#f3efe6'

const rangeOptions = [
  { value: ChartRange.week, label: 'Week' },
  { value: ChartRange.month, label: 'Month' },
  { value: ChartRange.year, label: 'Year' },
] as const

/** Week / Month / Year as real toggle buttons; the pressed one is the chart's range. */
export function ChartRangeSwitch({ idPrefix, label, value, onChange }: { idPrefix: string; label: string; value: ChartRange; onChange(value: ChartRange): void }) {
  return (
    <div aria-label={label} className="grid w-56 grid-cols-3 gap-1.5 rounded-2xl bg-[var(--app-control)] p-1.5" role="group">
      {rangeOptions.map((option) => {
        const selected = option.value === value
        return (
          <button
            aria-pressed={selected}
            className={cn('min-h-10 rounded-xl px-2 text-xs font-bold sm:text-sm', selected ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-600 hover:text-stone-900')}
            data-testid={`${idPrefix}-range-${option.value}`}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

interface ChartQuery<T> { data?: T; isPending: boolean; isError: boolean; error: unknown; isPlaceholderData: boolean; refetch(): unknown }

/** Loading, error, empty and chart for one card, sharing the card's chart height so nothing jumps. */
function ChartState<T>({ idPrefix, query, isEmpty, emptyText, children }: {
  idPrefix: string
  query: ChartQuery<T>
  isEmpty(data: T): boolean
  emptyText: string
  children(data: T): ReactNode
}) {
  if (query.isError && !query.data) return <ErrorMessage error={query.error} onRetry={() => query.refetch()} retryTestId={`${idPrefix}-retry`} testId={`${idPrefix}-error`} />
  if (query.isPending || !query.data) return <div aria-label="Loading chart" className="animate-pulse rounded-2xl bg-[var(--app-paper)]" data-testid={`${idPrefix}-loading`} role="status" style={{ height: chartHeight + 56 }} />
  if (isEmpty(query.data)) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-stone-300 bg-[var(--app-paper-muted)] px-6 text-center" data-testid={`${idPrefix}-empty`} style={{ height: chartHeight + 56 }}>
        <p className="text-sm font-semibold text-stone-500">{emptyText}</p>
      </div>
    )
  }
  return <div aria-busy={query.isPlaceholderData} className={cn('transition-opacity', query.isPlaceholderData && 'opacity-60')}>{children(query.data)}</div>
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(640)
  // Charts render only in the browser (after data loads), so measuring before paint is safe.
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    if (element.clientWidth) setWidth(Math.max(240, element.clientWidth))
    const observer = new ResizeObserver(([entry]) => { if (entry) setWidth(Math.max(240, Math.round(entry.contentRect.width))) })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/** Picks every k-th date so labels stay about `spacing` px apart, always keeping the last (today's). */
function sparseTicks<T>(items: readonly T[], width: number, spacing: number): T[] {
  const room = Math.max(2, Math.floor((width - plot.left - plot.right) / spacing))
  const step = Math.max(1, Math.ceil(items.length / room))
  return items.filter((_, index) => (items.length - 1 - index) % step === 0)
}

function tickLabel(day: string, range: ChartRange) {
  if (range === ChartRange.week) return formatChartDate(day, 'weekday')
  if (range === ChartRange.month) return formatChartDate(day, 'day')
  return formatChartDate(day, 'month')
}

function arrowStep(event: KeyboardEvent, count: number, active: number | null, set: (index: number | null) => void) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Escape') return
  event.preventDefault()
  if (event.key === 'Escape') return set(null)
  const from = active ?? count
  set(Math.min(count - 1, Math.max(0, from + (event.key === 'ArrowRight' ? 1 : -1))))
}

function Tooltip({ x, width, children }: { x: number; width: number; children: ReactNode }) {
  const left = Math.min(width - 84, Math.max(84, x))
  return <div className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs shadow-md" style={{ left }}>{children}</div>
}

function Stat({ label, value, testId }: { label: string; value: ReactNode; testId?: string }) {
  return <div><p className="text-xs font-bold uppercase text-stone-500">{label}</p><p className="data-number mt-1 text-lg font-bold text-stone-900" data-testid={testId}>{value}</p></div>
}

export interface WeightChartData { range: ChartRange; span: DateRange; points: WeightPoint[] }

export function WeightChart({ query, unit, range, onRangeChange }: { query: ChartQuery<WeightChartData>; unit: string; range: ChartRange; onRangeChange(range: ChartRange): void }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase text-stone-500">Trend, {rangePhrase[range]}</p>
        <ChartRangeSwitch idPrefix="weight-chart" label="Weight chart range" onChange={onRangeChange} value={range} />
      </div>
      <ChartState emptyText="No weight logged in this range" idPrefix="weight-chart" isEmpty={(data) => data.points.length === 0} query={query}>
        {(data) => <WeightLine data={data} unit={unit} />}
      </ChartState>
    </div>
  )
}

function WeightLine({ data, unit }: { data: WeightChartData; unit: string }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const { points, span, range } = data
  const summary = weightSummary(points, range, unit)
  const days = Math.max(1, dayOffset(span.start, span.end))
  const values = points.map((point) => point.value)
  const low = Math.min(...values)
  const high = Math.max(...values)
  const pad = Math.max((high - low) * 0.15, unit === 'kg' ? 0.5 : 1)
  const [yMin, yMax] = [low - pad, high + pad]
  const plotWidth = width - plot.left - plot.right
  const plotHeight = chartHeight - plot.top - plot.bottom
  const x = (day: string) => plot.left + (dayOffset(span.start, day) / days) * plotWidth
  const y = (value: number) => plot.top + (1 - (value - yMin) / (yMax - yMin)) * plotHeight
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.date).toFixed(1)} ${y(point.value).toFixed(1)}`).join(' ')
  const latest = points.at(-1)!
  const ticks = sparseTicks(range === ChartRange.year ? daysIn(span).filter((day) => day.endsWith('-01')) : daysIn(span), width, range === ChartRange.week ? 44 : 64)
  const focus = active === null ? null : points[active]

  function nearest(clientX: number, target: SVGElement) {
    const box = target.getBoundingClientRect()
    const at = clientX - box.left
    let best = 0
    points.forEach((point, index) => { if (Math.abs(x(point.date) - at) < Math.abs(x(points[best]!.date) - at)) best = index })
    setActive(best)
  }

  return (
    <div data-count={points.length} data-range={range} data-testid="weight-chart" data-unit={unit}>
      <div className="mb-3 flex flex-wrap gap-x-8 gap-y-3">
        <Stat label="Latest" testId="weight-chart-latest" value={`${formatChartValue(latest.value)} ${unit}`} />
        <Stat label="Low" value={`${formatChartValue(low)} ${unit}`} />
        <Stat label="High" value={`${formatChartValue(high)} ${unit}`} />
      </div>
      <div
        aria-label={`${summary}. Use the left and right arrow keys to read each entry.`}
        className="relative w-full min-w-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-stone-500"
        style={{ height: chartHeight }}
        onBlur={() => setActive(null)}
        onKeyDown={(event) => arrowStep(event, points.length, active, setActive)}
        ref={ref}
        role="group"
        tabIndex={0}
      >
        <span aria-live="polite" className="sr-only">{focus ? `${formatChartValue(focus.value)} ${unit}, ${formatChartDate(focus.date, 'full')}` : ''}</span>
        {focus && <Tooltip width={width} x={x(focus.date)}><span className="data-number font-bold text-stone-950">{formatChartValue(focus.value)} {unit}</span><span className="ml-2 text-stone-500">{formatChartDate(focus.date, 'full')}</span></Tooltip>}
        <svg aria-hidden="true" className="absolute left-0 top-0 block overflow-visible" height={chartHeight} role="img" width={width}>
          {[low, high].map((value, index) => (
            <g key={index}>
              <line stroke={ink.grid} strokeWidth="1" x1={plot.left} x2={width - plot.right} y1={y(value)} y2={y(value)} />
              <text dominantBaseline="middle" fill={ink.muted} fontSize="12" textAnchor="end" x={plot.left - 8} y={y(value)}>{formatChartValue(value)}</text>
            </g>
          ))}
          <line stroke={ink.grid} strokeWidth="1" x1={plot.left} x2={width - plot.right} y1={chartHeight - plot.bottom} y2={chartHeight - plot.bottom} />
          {ticks.map((day) => {
            const tx = x(day)
            const anchor = tx > width - plot.right - 24 ? 'end' : tx < plot.left + 24 ? 'start' : 'middle'
            return <text fill={ink.muted} fontSize="12" key={day} textAnchor={anchor} x={tx} y={chartHeight - 8}>{tickLabel(day, range)}</text>
          })}
          {focus && <line stroke="#a8a29e" strokeWidth="1" x1={x(focus.date)} x2={x(focus.date)} y1={plot.top} y2={chartHeight - plot.bottom} />}
          <path d={path} fill="none" stroke={weightColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          {points.length <= 31 && points.map((point) => <circle cx={x(point.date)} cy={y(point.value)} fill={weightColor} key={point.date} r="4" stroke={ink.surface} strokeWidth="2" />)}
          <circle cx={x(latest.date)} cy={y(latest.value)} fill={weightColor} r="5.5" stroke={ink.surface} strokeWidth="2" />
          {focus && <circle cx={x(focus.date)} cy={y(focus.value)} fill={ink.surface} r="5.5" stroke={weightColor} strokeWidth="2.5" />}
          <rect fill="transparent" height={plotHeight} onPointerLeave={() => setActive(null)} onPointerMove={(event) => nearest(event.clientX, event.currentTarget.ownerSVGElement ?? event.currentTarget)} width={plotWidth + 16} x={plot.left - 8} y={plot.top} />
        </svg>
      </div>
    </div>
  )
}

/** `unit` is the unit the totals were asked in, so a placeholder from the previous unit is never relabeled. */
export interface WaterChartData { range: ChartRange; span: DateRange; unit: string; bars: ChartBar[] }

export function WaterChart({ query, range, onRangeChange }: { query: ChartQuery<WaterChartData>; range: ChartRange; onRangeChange(range: ChartRange): void }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase text-stone-500">{range === ChartRange.year ? 'Monthly' : 'Daily'} totals, {rangePhrase[range]}</p>
        <ChartRangeSwitch idPrefix="water-chart" label="Water chart range" onChange={onRangeChange} value={range} />
      </div>
      <ChartState emptyText="No water logged in this range" idPrefix="water-chart" isEmpty={(data) => !data.bars.some((bar) => bar.logged)} query={query}>
        {(data) => <WaterBars data={data} unit={data.unit} />}
      </ChartState>
    </div>
  )
}

function WaterBars({ data, unit }: { data: WaterChartData; unit: string }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const { bars, span, range } = data
  const summary = waterSummary(bars, range, unit)
  const total = bars.reduce((sum, bar) => sum + bar.value, 0)
  const dayCount = daysIn(span).length
  const max = niceCeiling(Math.max(...bars.map((bar) => bar.value)))
  const plotWidth = width - plot.left - plot.right
  const plotHeight = chartHeight - plot.top - plot.bottom
  const band = plotWidth / bars.length
  const barWidth = Math.max(2, Math.min(24, band - 2))
  const baseline = chartHeight - plot.bottom
  const y = (value: number) => baseline - (value / max) * plotHeight
  const center = (index: number) => plot.left + band * index + band / 2
  const ticks = new Set(sparseTicks(bars.map((bar) => bar.key), width, range === ChartRange.week ? 44 : range === ChartRange.year ? 40 : 64))
  const focus = active === null ? null : bars[active]
  const digits = unit === 'cup' ? 2 : 1

  return (
    <div data-count={bars.filter((bar) => bar.logged).length} data-range={range} data-slots={bars.length} data-testid="water-chart" data-unit={unit}>
      <div className="mb-3 flex flex-wrap gap-x-8 gap-y-3">
        <Stat label="Total" testId="water-chart-total" value={`${formatChartValue(total, digits)} ${unit}`} />
        <Stat label="Daily average" value={`${formatChartValue(total / dayCount, digits)} ${unit}`} />
      </div>
      <div
        aria-label={`${summary}. Use the left and right arrow keys to read each ${range === ChartRange.year ? 'month' : 'day'}.`}
        className="relative w-full min-w-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-stone-500"
        style={{ height: chartHeight }}
        onBlur={() => setActive(null)}
        onKeyDown={(event) => arrowStep(event, bars.length, active, setActive)}
        onPointerLeave={() => setActive(null)}
        ref={ref}
        role="group"
        tabIndex={0}
      >
        <span aria-live="polite" className="sr-only">{focus ? `${focus.logged ? `${formatChartValue(focus.value, digits)} ${unit}` : 'Nothing logged'}, ${range === ChartRange.year ? formatChartDate(focus.start, 'monthYear') : formatChartDate(focus.start, 'full')}` : ''}</span>
        {focus && <Tooltip width={width} x={center(active!)}><span className="data-number font-bold text-stone-950">{focus.logged ? `${formatChartValue(focus.value, digits)} ${unit}` : 'Nothing logged'}</span><span className="ml-2 text-stone-500">{range === ChartRange.year ? formatChartDate(focus.start, 'monthYear') : formatChartDate(focus.start, 'full')}</span></Tooltip>}
        <svg aria-hidden="true" className="absolute left-0 top-0 block overflow-visible" height={chartHeight} role="img" width={width}>
          {[0, max / 2, max].map((value) => (
            <g key={value}>
              <line stroke={ink.grid} strokeWidth="1" x1={plot.left} x2={width - plot.right} y1={y(value)} y2={y(value)} />
              <text dominantBaseline="middle" fill={ink.muted} fontSize="12" textAnchor="end" x={plot.left - 8} y={y(value)}>{formatChartValue(value, digits)}</text>
            </g>
          ))}
          {bars.map((bar, index) => {
            const left = center(index) - barWidth / 2
            const top = y(bar.value)
            const radius = Math.min(4, barWidth / 2, baseline - top)
            const shape = `M ${left} ${baseline} V ${top + radius} Q ${left} ${top} ${left + radius} ${top} H ${left + barWidth - radius} Q ${left + barWidth} ${top} ${left + barWidth} ${top + radius} V ${baseline} Z`
            return (
              <g key={bar.key} onPointerEnter={() => setActive(index)}>
                <rect fill={waterSlot} height={plotHeight} rx={Math.min(4, barWidth / 2)} width={barWidth} x={left} y={plot.top} />
                {bar.value > 0 && <path d={shape} fill={waterColor} fillOpacity={active === index ? 0.8 : 1} />}
                <rect fill="transparent" height={plotHeight + plot.bottom} width={band} x={plot.left + band * index} y={plot.top} />
                {ticks.has(bar.key) && <text fill={ink.muted} fontSize="12" textAnchor="middle" x={center(index)} y={chartHeight - 8}>{tickLabel(bar.start, range)}</text>}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
