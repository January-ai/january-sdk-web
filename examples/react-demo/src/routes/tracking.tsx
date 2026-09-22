import { VolumeUnit, WeightUnit, type FoodLog, type WaterLog } from '@januaryai/web-sdk'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Activity, CalendarDays, ChevronLeft, ChevronRight, Droplets, NotebookPen, Pencil, Plus, RefreshCw, Scale, Trash2, Utensils } from 'lucide-react'
import { useState } from 'react'
import { createWaterLog, createWeightLog, deleteFoodLog, deleteWaterLog, getFoodLogSummary, listFoodLogs, listWaterLogs, listWeightLogs } from '~/api/january.functions'
import { Dialog } from '~/components/dialog'
import { FoodLogEditor } from '~/components/food-log-editor'
import { NetworkImage } from '~/components/network-image'
import { SegmentedControl } from '~/components/segmented-control'
import { UserContextCard } from '~/components/user-context-card'
import { useUserSession } from '~/components/user-session'
import { Button, Card, EmptyState, ErrorMessage, Page, PageHeader, SecondaryButton, SectionLabel, SkeletonList, TextField } from '~/components/ui'
import { formatDay, shiftDay, todayLocalDate } from '~/lib/log-day'
import { formatNumber } from '~/lib/utils'

export const Route = createFileRoute('/tracking')({ component: TrackingPage })

type VolumeUnitValue = (typeof VolumeUnit)[keyof typeof VolumeUnit]
type WeightUnitValue = (typeof WeightUnit)[keyof typeof WeightUnit]

const volumeUnits = [
  { value: VolumeUnit.fluidOunces, label: 'fl oz', testId: 'water-unit-fl-oz' },
  { value: VolumeUnit.milliliters, label: 'ml', testId: 'water-unit-ml' },
  { value: VolumeUnit.cups, label: 'cup', testId: 'water-unit-cup' },
] as const
const weightUnits = [
  { value: WeightUnit.pounds, label: 'lb', testId: 'weight-unit-lb' },
  { value: WeightUnit.kilograms, label: 'kg', testId: 'weight-unit-kg' },
] as const

const unitLabel = (unit: string) => (unit === VolumeUnit.fluidOunces ? 'fl oz' : unit)
const timeOf = (iso: string) => new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(new Date(iso))

function TrackingPage() {
  const queryClient = useQueryClient()
  const session = useUserSession()
  const [day, setDay] = useState(() => todayLocalDate())
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<FoodLog | undefined>()
  const [waterValue, setWaterValue] = useState(8)
  const [waterUnit, setWaterUnit] = useState<VolumeUnitValue>(VolumeUnit.fluidOunces)
  const [lastWaterLog, setLastWaterLog] = useState<WaterLog | null>(null)
  const [weightValue, setWeightValue] = useState(150)
  const [weightUnit, setWeightUnit] = useState<WeightUnitValue>(WeightUnit.pounds)

  const ready = Boolean(session.endUserId)
  const context = { endUserId: session.endUserId, endUserTimezone: session.endUserTimezone }
  const dayRange = { start: day, end: day }
  // Every query is keyed by the day (and unit), so moving between days never reuses a stale answer.
  const logs = useQuery({
    queryKey: ['food-logs', context, day],
    queryFn: () => listFoodLogs({ data: { ...context, ...dayRange } }),
    enabled: ready,
    placeholderData: keepPreviousData,
  })
  const summary = useQuery({
    queryKey: ['food-log-summary', context, day],
    queryFn: () => getFoodLogSummary({ data: { ...context, ...dayRange } }),
    enabled: ready,
  })
  const water = useQuery({
    queryKey: ['water-logs', context, day, waterUnit],
    queryFn: () => listWaterLogs({ data: { ...context, ...dayRange, unit: waterUnit } }),
    enabled: ready,
  })
  const weight = useQuery({
    queryKey: ['weight-logs', context, day],
    queryFn: () => listWeightLogs({ data: { ...context, ...dayRange } }),
    enabled: ready,
  })

  const invalidateFood = () => {
    queryClient.invalidateQueries({ queryKey: ['food-logs'] })
    queryClient.invalidateQueries({ queryKey: ['food-log-summary'] })
  }
  const removeFood = useMutation({
    mutationFn: (logId: string) => deleteFoodLog({ data: { ...context, logId } }),
    onSuccess: invalidateFood,
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
  const logWeight = useMutation({
    mutationFn: () => createWeightLog({ data: { ...context, value: weightValue, unit: weightUnit } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weight-logs'] }),
  })

  function changeDay(next: string) {
    setDay(next)
    setLastWaterLog(null)
    logWater.reset()
    logWeight.reset()
  }

  function openEditor(log?: FoodLog) {
    setEditingLog(log)
    setEditorOpen(true)
  }

  function editorSaved() {
    setEditorOpen(false)
    setEditingLog(undefined)
    invalidateFood()
  }

  const dayTotals = summary.data?.totals.nutrients
  const waterTotal = water.data?.items.find((item) => item.date === day) ?? water.data?.items[0]
  const dayWeight = weight.data?.items.find((item) => item.date === day) ?? weight.data?.items[0]

  return (
    <Page data-testid="tracking-screen">
      <PageHeader aside={<Button data-testid="tracking-meal-add" disabled={!ready} onClick={() => openEditor()} type="button"><Plus aria-hidden="true" className="size-4" />Add meal</Button>} description="One partner-owned account ID and timezone scope every log. Pick a day: the SDK sends it as the inclusive start and end date for meals, water, and weight." eyebrow="Partner-owned identity" title="Tracking, one day at a time." />
      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(340px,0.78fr)_minmax(0,1.35fr)] xl:items-start">
        <div className="space-y-5 xl:sticky xl:top-8">
          <UserContextCard description="The demo stores this account context in this browser. The SDK applies it to every log without owning or persisting identity." />
          <Card className="p-5 sm:p-6" data-testid="logs-day-card">
            <SectionLabel>Day</SectionLabel>
            <div className="mt-4 flex items-center gap-2">
              <SecondaryButton aria-label="Previous day" className="min-h-11 px-3" data-testid="logs-day-previous" onClick={() => changeDay(shiftDay(day, -1))} type="button"><ChevronLeft aria-hidden="true" className="size-4" /></SecondaryButton>
              <p className="flex-1 text-center font-semibold text-stone-800" data-testid="logs-day-label">{formatDay(day)}</p>
              <SecondaryButton aria-label="Next day" className="min-h-11 px-3" data-testid="logs-day-next" onClick={() => changeDay(shiftDay(day, 1))} type="button"><ChevronRight aria-hidden="true" className="size-4" /></SecondaryButton>
            </div>
            <TextField className="mt-4" data-testid="logs-day-input" label="Date" onChange={(event) => { if (event.currentTarget.value) changeDay(event.currentTarget.value) }} type="date" value={day} />
            <p className="data-number mt-3 text-xs text-stone-500">API: start and end {day}, in {session.endUserTimezone}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <SecondaryButton data-testid="logs-day-today" disabled={day === todayLocalDate()} onClick={() => changeDay(todayLocalDate())} type="button"><CalendarDays aria-hidden="true" className="size-4" />Today</SecondaryButton>
              <SecondaryButton data-testid="logs-day-refresh" disabled={!ready} onClick={() => { invalidateFood(); queryClient.invalidateQueries({ queryKey: ['water-logs'] }); queryClient.invalidateQueries({ queryKey: ['weight-logs'] }) }} type="button"><RefreshCw aria-hidden="true" className="size-4" />Reload day</SecondaryButton>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <section aria-busy={logs.isFetching} aria-live="polite" data-testid="food-section">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div><SectionLabel>Meals</SectionLabel><h2 className="mt-2 font-serif text-4xl">{logs.data ? `${logs.data.totalCount} logged meal${logs.data.totalCount === 1 ? '' : 's'}` : 'Meals for the day'}</h2>{logs.isFetching && logs.data && <p className="mt-2 text-sm font-semibold text-stone-500">Refreshing meals…</p>}</div>
              <Activity aria-hidden="true" className="size-7 text-stone-400" />
            </div>
            {ready && (summary.isError
              ? <div className="mb-4"><ErrorMessage error={summary.error} testId="food-day-totals-error" /></div>
              : <Card className="mb-4 grid grid-cols-2 gap-4 p-5 sm:grid-cols-4 sm:p-6" data-testid="food-day-totals">
                {([['Calories', dayTotals?.calories, 0], ['Protein', dayTotals?.protein, 1], ['Carbs', dayTotals?.carbohydrates, 1], ['Fat', dayTotals?.totalFat, 1]] as const).map(([label, amount, digits]) => <div key={label}><p className="text-xs font-bold uppercase text-stone-500">{label}</p><p className="data-number mt-1 text-2xl font-bold">{summary.isPending ? '…' : formatNumber(amount?.value, digits)}<span className="ml-1 text-sm font-semibold text-stone-500">{amount?.unit ?? (label === 'Calories' ? 'kcal' : 'g')}</span></p></div>)}
              </Card>)}
            {removeFood.isError ? <div className="mb-4"><ErrorMessage error={removeFood.error} testId="tracking-meal-delete-error" /></div> : null}
            {!ready ? <EmptyState description="Save an active user to load the day's meals, water, and weight." icon={<NotebookPen aria-hidden="true" className="size-6" />} testId="tracking-prompt" title="No user yet" />
              : logs.isPending && !logs.data ? <SkeletonList testId="tracking-meals-loading" />
                : logs.isError ? <ErrorMessage error={logs.error} testId="tracking-meals-error" />
                  : logs.data?.items.length ? <div className="space-y-4" data-testid="tracking-meal-list">{logs.data.items.map((log, index) => <Card className="overflow-hidden" data-testid={`tracking-meal-${index}`} key={log.id ?? `log-${index}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-4 sm:px-6"><div><h3 className="text-lg font-bold">{log.name || 'Logged meal'}</h3><p className="data-number mt-1 text-sm text-stone-500">{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(log.timestampUtc))}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-[#eee8dc] px-3 py-1.5 text-xs font-bold text-stone-600">{log.foods.length} food{log.foods.length === 1 ? '' : 's'}</span><button aria-label={`Edit ${log.name || 'meal'}`} className="grid size-10 place-items-center rounded-full hover:bg-stone-100" data-testid="tracking-meal-open" disabled={!log.id} onClick={() => openEditor(log)} type="button"><Pencil aria-hidden="true" className="size-4" /></button><button aria-label={`Delete ${log.name || 'meal'}`} className="grid size-10 place-items-center rounded-full text-red-800 hover:bg-red-50" data-testid="tracking-meal-delete" disabled={removeFood.isPending || !log.id} onClick={() => log.id && removeFood.mutate(log.id)} type="button"><Trash2 aria-hidden="true" className="size-4" /></button></div></div>
                    {log.foods.map((food, foodIndex) => <div className="flex items-center gap-4 border-b border-stone-200 px-5 py-4 last:border-0 sm:px-6" key={`${log.id ?? index}-${food.id ?? foodIndex}`}><NetworkImage alt="" className="size-12 shrink-0 rounded-xl" fallback={<Utensils aria-hidden="true" className="size-5 text-stone-600" />} src={food.imageUrl} /><div className="min-w-0 flex-1"><div className="truncate font-bold">{food.name ?? 'Unnamed food'}</div><div className="data-number mt-1 text-sm text-stone-500">{formatNumber(food.nutrients.calories?.value, 0)} cal · {formatNumber(food.consumedServing.quantity)} {food.servingDetails.unit ?? 'serving'}</div></div></div>)}
                  </Card>)}</div>
                    : <EmptyState description="No meals were logged for this person on this day." icon={<NotebookPen aria-hidden="true" className="size-6" />} testId="tracking-meals-empty" title="No food logs found" />}
          </section>

          <section aria-busy={water.isFetching} aria-live="polite" data-testid="water-section">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div><SectionLabel>Water</SectionLabel><h2 className="mt-2 font-serif text-4xl">Water for the day</h2></div>
              <Droplets aria-hidden="true" className="size-7 text-stone-400" />
            </div>
            <Card className="p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-stone-500">Total</p>
                  {!ready ? <p className="mt-1 text-sm text-stone-500">Save an active user first.</p>
                    : water.isPending ? <p className="mt-1 text-2xl font-bold text-stone-400" data-testid="water-logs-loading">…</p>
                      : water.isError ? <ErrorMessage error={water.error} testId="water-logs-error" />
                        : waterTotal ? <p className="data-number mt-1 text-2xl font-bold" data-testid="water-day-total">{formatNumber(waterTotal.total.value)} {unitLabel(waterTotal.total.unit)}</p>
                          : <p className="mt-1 text-sm font-semibold text-stone-500" data-testid="water-logs-empty">Nothing logged yet</p>}
                </div>
                <SegmentedControl<VolumeUnitValue> className="w-56" label="Water unit" name="water-unit" onChange={setWaterUnit} options={volumeUnits} value={waterUnit} />
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <TextField data-testid="water-amount" inputMode="decimal" label={`Amount (${unitLabel(waterUnit)})`} min={waterUnit === VolumeUnit.cups ? 0.125 : 1} onChange={(event) => { if (Number.isFinite(event.currentTarget.valueAsNumber)) setWaterValue(event.currentTarget.valueAsNumber) }} step={waterUnit === VolumeUnit.cups ? 0.125 : 0.5} type="number" value={waterValue} />
                <Button busy={logWater.isPending} data-testid="water-log-add" disabled={!ready || logWater.isPending || waterValue <= 0} onClick={() => logWater.mutate()} type="button">Log water</Button>
              </div>
              {logWater.isError ? <div className="mt-4"><ErrorMessage error={logWater.error} testId="water-log-add-error" /></div> : null}
              {removeWater.isError ? <div className="mt-4"><ErrorMessage error={removeWater.error} testId="water-log-delete-error" /></div> : null}
              {lastWaterLog && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f8f5ed] px-4 py-3 text-sm" data-testid="water-log-last">
                <span className="font-semibold text-stone-700">Logged {formatNumber(lastWaterLog.amount.value)} {unitLabel(lastWaterLog.amount.unit)} at {timeOf(lastWaterLog.consumedAt)}</span>
                <button className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-bold text-red-800 hover:bg-red-50" data-testid="water-log-delete" disabled={removeWater.isPending} onClick={() => removeWater.mutate(lastWaterLog.id)} type="button"><Trash2 aria-hidden="true" className="size-4" />Delete this entry</button>
              </div>}
            </Card>
          </section>

          <section aria-busy={weight.isFetching} aria-live="polite" data-testid="weight-section">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div><SectionLabel>Weight</SectionLabel><h2 className="mt-2 font-serif text-4xl">Weight for the day</h2></div>
              <Scale aria-hidden="true" className="size-7 text-stone-400" />
            </div>
            <Card className="p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-stone-500">Latest measurement</p>
                  {!ready ? <p className="mt-1 text-sm text-stone-500">Save an active user first.</p>
                    : weight.isPending ? <p className="mt-1 text-2xl font-bold text-stone-400" data-testid="weight-logs-loading">…</p>
                      : weight.isError ? <ErrorMessage error={weight.error} testId="weight-logs-error" />
                        : dayWeight ? <p className="data-number mt-1 text-2xl font-bold" data-testid="weight-day-value">{formatNumber(dayWeight.weight.value)} {dayWeight.weight.unit}</p>
                          : <p className="mt-1 text-sm font-semibold text-stone-500" data-testid="weight-logs-empty">Nothing logged yet</p>}
                </div>
                <SegmentedControl<WeightUnitValue> className="w-40" label="Weight unit" name="weight-unit" onChange={setWeightUnit} options={weightUnits} value={weightUnit} />
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <TextField data-testid="weight-value" inputMode="decimal" label={`Weight (${weightUnit})`} min={1} onChange={(event) => { if (Number.isFinite(event.currentTarget.valueAsNumber)) setWeightValue(event.currentTarget.valueAsNumber) }} step="0.1" type="number" value={weightValue} />
                <Button busy={logWeight.isPending} data-testid="weight-log-add" disabled={!ready || logWeight.isPending || weightValue <= 0} onClick={() => logWeight.mutate()} type="button">Log weight</Button>
              </div>
              {logWeight.isError ? <div className="mt-4"><ErrorMessage error={logWeight.error} testId="weight-log-add-error" /></div> : null}
              {logWeight.data && <p className="mt-5 rounded-2xl bg-[#f8f5ed] px-4 py-3 text-sm font-semibold text-stone-700" data-testid="weight-log-last">Logged {formatNumber(logWeight.data.weight.value)} {logWeight.data.weight.unit} at {timeOf(logWeight.data.measuredAt)}</p>}
            </Card>
          </section>
        </div>
      </div>
      <Dialog onClose={() => setEditorOpen(false)} open={editorOpen} title={editingLog ? 'Edit meal' : 'Add a meal'}>
        <FoodLogEditor key={editingLog?.id ?? 'new'} log={editingLog} onSaved={editorSaved} />
      </Dialog>
    </Page>
  )
}
