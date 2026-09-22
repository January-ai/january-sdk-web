import { VolumeUnit, WeightUnit, type WaterLog } from '@januaryai/web-sdk'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Droplets, Scale, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createWaterLog, createWeightLog, deleteWaterLog, listWaterLogs, listWeightLogs } from '~/api/january.functions'
import { SegmentedControl } from '~/components/segmented-control'
import { UserContextCard } from '~/components/user-context-card'
import { useUserSession } from '~/components/user-session'
import { Button, Card, EmptyState, ErrorMessage, Page, PageHeader, SectionLabel, SkeletonList, TextField } from '~/components/ui'
import { FoodLogTimeSpan, resolveFoodLogTimeSpan, type FoodLogTimeSpan as FoodLogTimeSpanValue } from '~/lib/food-log-time-span'
import { formatNumber } from '~/lib/utils'

export const Route = createFileRoute('/water-weight')({ component: WaterWeightPage })

type VolumeUnitValue = (typeof VolumeUnit)[keyof typeof VolumeUnit]
type WeightUnitValue = (typeof WeightUnit)[keyof typeof WeightUnit]

const spans = [
  { value: FoodLogTimeSpan.today, label: 'Today', testId: 'body-logs-range-today' },
  { value: FoodLogTimeSpan.thisWeek, label: 'This week', testId: 'body-logs-range-week' },
  { value: FoodLogTimeSpan.lastMonth, label: 'Last month', testId: 'body-logs-range-month' },
] as const
const volumeUnits = [
  { value: VolumeUnit.fluidOunces, label: 'fl oz', testId: 'water-unit-fl-oz' },
  { value: VolumeUnit.milliliters, label: 'ml', testId: 'water-unit-ml' },
] as const
const weightUnits = [
  { value: WeightUnit.pounds, label: 'lb', testId: 'weight-unit-lb' },
  { value: WeightUnit.kilograms, label: 'kg', testId: 'weight-unit-kg' },
] as const

const unitLabel = (unit: string) => (unit === VolumeUnit.fluidOunces ? 'fl oz' : unit)
const formatDay = (date: string) => new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`))

function WaterWeightPage() {
  const queryClient = useQueryClient()
  const session = useUserSession()
  const [span, setSpan] = useState<FoodLogTimeSpanValue>(FoodLogTimeSpan.today)
  const range = useMemo(() => resolveFoodLogTimeSpan(span), [span])
  const context = { endUserId: session.endUserId, endUserTimezone: session.endUserTimezone }

  const [waterValue, setWaterValue] = useState(8)
  const [waterUnit, setWaterUnit] = useState<VolumeUnitValue>(VolumeUnit.fluidOunces)
  const [lastWaterLog, setLastWaterLog] = useState<WaterLog | null>(null)
  const [waterRequest, setWaterRequest] = useState<{ start: string; end: string; unit: VolumeUnitValue } | null>(null)
  const waterTotals = useQuery({
    queryKey: ['water-logs', context, waterRequest],
    queryFn: () => listWaterLogs({ data: { ...context, ...waterRequest! } }),
    enabled: waterRequest !== null && Boolean(session.endUserId),
    placeholderData: keepPreviousData,
  })
  const logWater = useMutation({
    mutationFn: () => createWaterLog({ data: { ...context, value: waterValue, unit: waterUnit } }),
    onSuccess: (log) => {
      setLastWaterLog(log)
      queryClient.invalidateQueries({ queryKey: ['water-logs'] })
    },
  })
  const removeWater = useMutation({
    mutationFn: (logId: string) => deleteWaterLog({ data: { ...context, logId } }),
    onSuccess: () => {
      setLastWaterLog(null)
      queryClient.invalidateQueries({ queryKey: ['water-logs'] })
    },
  })

  const [weightValue, setWeightValue] = useState(150)
  const [weightUnit, setWeightUnit] = useState<WeightUnitValue>(WeightUnit.pounds)
  const [weightRequest, setWeightRequest] = useState<{ start: string; end: string } | null>(null)
  const weights = useQuery({
    queryKey: ['weight-logs', context, weightRequest],
    queryFn: () => listWeightLogs({ data: { ...context, ...weightRequest! } }),
    enabled: weightRequest !== null && Boolean(session.endUserId),
    placeholderData: keepPreviousData,
  })
  const logWeight = useMutation({
    mutationFn: () => createWeightLog({ data: { ...context, value: weightValue, unit: weightUnit } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weight-logs'] }),
  })

  const ready = Boolean(session.endUserId)

  return (
    <Page data-testid="water-weight-screen">
      <PageHeader description="Water and weight logs reuse the food-log identity and timezone. Water lists as one total per local day in the unit you ask for; weight lists the latest measurement per day." eyebrow="Partner-owned identity" title="Water and weight, day by day." />
      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(340px,0.78fr)_minmax(0,1.35fr)] xl:items-start">
        <div className="space-y-5 xl:sticky xl:top-8">
          <UserContextCard description="The same stable user ID and IANA timezone scope every water and weight request." />
          <Card className="p-5 sm:p-6">
            <SectionLabel>Date range</SectionLabel>
            <SegmentedControl<FoodLogTimeSpan> className="mt-4" label="Log date range" name="body-log-range" onChange={setSpan} options={spans} value={span} />
            <p className="mt-4 font-semibold text-stone-800">{range.display}</p>
            <p className="data-number mt-1 text-xs text-stone-500">API: {range.start} through {range.end}, inclusive</p>
          </Card>
        </div>

        <div className="space-y-8">
          <section aria-busy={waterTotals.isFetching} aria-live="polite" data-testid="water-section">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div><SectionLabel>Water</SectionLabel><h2 className="mt-2 font-serif text-4xl">Daily totals</h2></div>
              <Droplets aria-hidden="true" className="size-7 text-stone-400" />
            </div>
            <Card className="p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <TextField data-testid="water-amount" inputMode="decimal" label={`Amount (${unitLabel(waterUnit)})`} min={1} onChange={(event) => { if (Number.isFinite(event.currentTarget.valueAsNumber)) setWaterValue(event.currentTarget.valueAsNumber) }} step="0.5" type="number" value={waterValue} />
                <SegmentedControl<VolumeUnitValue> className="w-40" label="Water unit" name="water-unit" onChange={setWaterUnit} options={volumeUnits} value={waterUnit} />
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button busy={logWater.isPending} data-testid="water-log-add" disabled={!ready || logWater.isPending || waterValue <= 0} onClick={() => logWater.mutate()} type="button">Log water</Button>
                <Button className="bg-white text-stone-800 shadow-none ring-1 ring-stone-300 hover:bg-stone-50" data-testid="water-logs-refresh" disabled={!ready} onClick={() => setWaterRequest({ start: range.start, end: range.end, unit: waterUnit })} type="button">Load daily totals</Button>
              </div>
              {logWater.isError ? <div className="mt-4"><ErrorMessage error={logWater.error} testId="water-log-add-error" /></div> : null}
              {removeWater.isError ? <div className="mt-4"><ErrorMessage error={removeWater.error} testId="water-log-delete-error" /></div> : null}
              {lastWaterLog && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f8f5ed] px-4 py-3 text-sm" data-testid="water-log-last">
                <span className="font-semibold text-stone-700">Logged {formatNumber(lastWaterLog.amount.value)} {unitLabel(lastWaterLog.amount.unit)} at {new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(new Date(lastWaterLog.consumedAt))}</span>
                <button className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-bold text-red-800 hover:bg-red-50" data-testid="water-log-delete" disabled={removeWater.isPending} onClick={() => removeWater.mutate(lastWaterLog.id)} type="button"><Trash2 aria-hidden="true" className="size-4" />Delete this entry</button>
              </div>}
            </Card>
            <div className="mt-4">
              {!waterRequest ? <EmptyState description="Log a glass, then load the totals for the selected range." icon={<Droplets aria-hidden="true" className="size-6" />} testId="water-logs-prompt" title="No totals loaded" />
                : waterTotals.isPending && !waterTotals.data ? <SkeletonList testId="water-logs-loading" />
                  : waterTotals.isError ? <ErrorMessage error={waterTotals.error} testId="water-logs-error" />
                    : waterTotals.data?.items.length ? <Card className="overflow-hidden" data-testid="water-total-list">{waterTotals.data.items.map((day, index) => <div className="flex items-center justify-between gap-4 border-b border-stone-200 px-5 py-4 last:border-0 sm:px-6" data-testid={`water-total-${index}`} key={day.date}><span className="font-bold">{formatDay(day.date)}</span><span className="data-number text-stone-700">{formatNumber(day.total.value)} {unitLabel(day.total.unit)}</span></div>)}</Card>
                      : <EmptyState description="No water was logged for this person and date range." icon={<Droplets aria-hidden="true" className="size-6" />} testId="water-logs-empty" title="No water logged" />}
            </div>
          </section>

          <section aria-busy={weights.isFetching} aria-live="polite" data-testid="weight-section">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div><SectionLabel>Weight</SectionLabel><h2 className="mt-2 font-serif text-4xl">Latest per day</h2></div>
              <Scale aria-hidden="true" className="size-7 text-stone-400" />
            </div>
            <Card className="p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <TextField data-testid="weight-value" inputMode="decimal" label={`Weight (${weightUnit})`} min={1} onChange={(event) => { if (Number.isFinite(event.currentTarget.valueAsNumber)) setWeightValue(event.currentTarget.valueAsNumber) }} step="0.1" type="number" value={weightValue} />
                <SegmentedControl<WeightUnitValue> className="w-40" label="Weight unit" name="weight-unit" onChange={setWeightUnit} options={weightUnits} value={weightUnit} />
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button busy={logWeight.isPending} data-testid="weight-log-add" disabled={!ready || logWeight.isPending || weightValue <= 0} onClick={() => logWeight.mutate()} type="button">Log weight</Button>
                <Button className="bg-white text-stone-800 shadow-none ring-1 ring-stone-300 hover:bg-stone-50" data-testid="weight-logs-refresh" disabled={!ready} onClick={() => setWeightRequest({ start: range.start, end: range.end })} type="button">Load weights</Button>
              </div>
              {logWeight.isError ? <div className="mt-4"><ErrorMessage error={logWeight.error} testId="weight-log-add-error" /></div> : null}
              {logWeight.data && <p className="mt-5 rounded-2xl bg-[#f8f5ed] px-4 py-3 text-sm font-semibold text-stone-700" data-testid="weight-log-last">Logged {formatNumber(logWeight.data.weight.value)} {logWeight.data.weight.unit} at {new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(new Date(logWeight.data.measuredAt))}</p>}
            </Card>
            <div className="mt-4">
              {!weightRequest ? <EmptyState description="Log a measurement, then load the weights for the selected range." icon={<Scale aria-hidden="true" className="size-6" />} testId="weight-logs-prompt" title="No weights loaded" />
                : weights.isPending && !weights.data ? <SkeletonList testId="weight-logs-loading" />
                  : weights.isError ? <ErrorMessage error={weights.error} testId="weight-logs-error" />
                    : weights.data?.items.length ? <Card className="overflow-hidden" data-testid="weight-day-list">{weights.data.items.map((day, index) => <div className="flex items-center justify-between gap-4 border-b border-stone-200 px-5 py-4 last:border-0 sm:px-6" data-testid={`weight-day-${index}`} key={day.date}><span className="font-bold">{formatDay(day.date)}</span><span className="data-number text-stone-700">{formatNumber(day.weight.value)} {day.weight.unit}</span></div>)}</Card>
                      : <EmptyState description="No weight was logged for this person and date range." icon={<Scale aria-hidden="true" className="size-6" />} testId="weight-logs-empty" title="No weight logged" />}
            </div>
          </section>
        </div>
      </div>
    </Page>
  )
}
