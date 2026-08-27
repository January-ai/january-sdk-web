import type { FoodLog } from '@januaryai/partner-sdk'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { CalendarDays, ClipboardList, Pencil, Plus, Trash2, Utensils } from 'lucide-react'
import { useMemo, useState } from 'react'
import { deleteFoodLog, listFoodLogs } from '~/api/january.functions'
import { Dialog } from '~/components/dialog'
import { FoodLogEditor } from '~/components/food-log-editor'
import { NetworkImage } from '~/components/network-image'
import { SegmentedControl } from '~/components/segmented-control'
import { UserContextCard } from '~/components/user-context-card'
import { useUserSession } from '~/components/user-session'
import { Button, Card, EmptyState, ErrorMessage, Page, PageHeader, SectionLabel, SkeletonList } from '~/components/ui'
import { FoodLogTimeSpan, resolveFoodLogTimeSpan, type FoodLogTimeSpan as FoodLogTimeSpanValue } from '~/lib/food-log-time-span'
import { formatNumber } from '~/lib/utils'

export const Route = createFileRoute('/food-logs')({ component: FoodLogsPage })

const spans = [
  { value: FoodLogTimeSpan.today, label: 'Today' },
  { value: FoodLogTimeSpan.thisWeek, label: 'This week' },
  { value: FoodLogTimeSpan.lastMonth, label: 'Last month' },
] as const

function FoodLogsPage() {
  const queryClient = useQueryClient()
  const session = useUserSession()
  const [span, setSpan] = useState<FoodLogTimeSpanValue>(FoodLogTimeSpan.today)
  const range = useMemo(() => resolveFoodLogTimeSpan(span), [span])
  const [request, setRequest] = useState<{ endUserId: string; endUserTimezone: string; start: string; end: string } | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<FoodLog | undefined>()
  const logs = useQuery({
    queryKey: ['food-logs', request],
    queryFn: () => listFoodLogs({ data: request! }),
    enabled: request !== null,
    placeholderData: keepPreviousData,
  })
  const remove = useMutation({
    mutationFn: (logId: string) => deleteFoodLog({ data: { logId, endUserId: session.endUserId, endUserTimezone: session.endUserTimezone } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['food-logs'] }),
  })

  function openEditor(log?: FoodLog) {
    setEditingLog(log)
    setEditorOpen(true)
  }

  function editorSaved() {
    setEditorOpen(false)
    setEditingLog(undefined)
    queryClient.invalidateQueries({ queryKey: ['food-logs'] })
  }

  return (
    <Page>
      <PageHeader aside={<Button disabled={!session.endUserId} onClick={() => openEditor()} type="button"><Plus aria-hidden="true" className="size-4" />Add meal</Button>} description="Use one partner-owned account ID for meal history. Calendar presets resolve locally, then the scoped SDK sends inclusive API dates." eyebrow="Partner-owned identity" title="Food logs with context." />
      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(340px,0.78fr)_minmax(0,1.35fr)] xl:items-start">
        <div className="space-y-5 xl:sticky xl:top-8">
          <UserContextCard description="The demo stores this account context in this browser. The SDK applies it to Food Logs without owning or persisting identity." />
          <Card className="p-5 sm:p-6">
            <SectionLabel>Date range</SectionLabel>
            <SegmentedControl<FoodLogTimeSpan> className="mt-4" label="Food log date range" name="food-log-range" onChange={setSpan} options={spans} value={span} />
            <p className="mt-4 font-semibold text-stone-800">{range.display}</p>
            <p className="data-number mt-1 text-xs text-stone-500">API: {range.start} through {range.end}, inclusive</p>
            <Button className="mt-6 w-full" disabled={!session.endUserId} onClick={() => setRequest({ endUserId: session.endUserId, endUserTimezone: session.endUserTimezone, start: range.start, end: range.end })} type="button">Load food logs</Button>
          </Card>
          <Card className="p-5 text-sm leading-6 text-stone-600 sm:p-6">
            <SectionLabel>One meal, multiple foods</SectionLabel>
            <p className="mt-3">Create and update requests submit the complete meal once: an array of foods, each with its selected serving and quantity, plus an optional UTC meal time.</p>
          </Card>
        </div>

        <section aria-busy={logs.isFetching} aria-live="polite">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div><SectionLabel>Meal history</SectionLabel><h2 className="mt-2 font-serif text-4xl">{logs.data ? `${logs.data.totalCount} logged meal${logs.data.totalCount === 1 ? '' : 's'}` : 'Choose a date range'}</h2>{logs.isFetching && logs.data && <p className="mt-2 text-sm font-semibold text-stone-500">Refreshing meal history…</p>}</div>
            <CalendarDays aria-hidden="true" className="size-7 text-stone-400" />
          </div>
          {!request ? <EmptyState description="Save an active user and load a calendar range to see meal history." icon={<ClipboardList aria-hidden="true" className="size-6" />} title="No request yet" />
            : logs.isPending && !logs.data ? <SkeletonList />
              : logs.isError ? <ErrorMessage error={logs.error} />
                : logs.data?.items.length ? <div className="space-y-4">{logs.data.items.map((log) => <Card className="overflow-hidden" key={log.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-4 sm:px-6"><div><h3 className="text-lg font-bold">{log.name || 'Logged meal'}</h3><p className="data-number mt-1 text-sm text-stone-500">{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(log.timestampUtc))}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-[#eee8dc] px-3 py-1.5 text-xs font-bold text-stone-600">{log.foods.length} food{log.foods.length === 1 ? '' : 's'}</span><button aria-label={`Edit ${log.name || 'meal'}`} className="grid size-10 place-items-center rounded-full hover:bg-stone-100" onClick={() => openEditor(log)} type="button"><Pencil aria-hidden="true" className="size-4" /></button><button aria-label={`Delete ${log.name || 'meal'}`} className="grid size-10 place-items-center rounded-full text-red-800 hover:bg-red-50" disabled={remove.isPending} onClick={() => remove.mutate(log.id)} type="button"><Trash2 aria-hidden="true" className="size-4" /></button></div></div>
                  {log.foods.map((food) => <div className="flex items-center gap-4 border-b border-stone-200 px-5 py-4 last:border-0 sm:px-6" key={`${log.id}-${food.id}`}><NetworkImage alt="" className="size-12 shrink-0 rounded-xl" fallback={<Utensils aria-hidden="true" className="size-5 text-stone-600" />} src={food.imageUrl} /><div className="min-w-0 flex-1"><div className="truncate font-bold">{food.name}</div><div className="data-number mt-1 text-sm text-stone-500">{formatNumber(food.nutrients.calories?.value, 0)} cal · {formatNumber(food.consumedServing.quantity)} {food.servingDetails.unit}</div></div></div>)}
                </Card>)}</div>
                  : <EmptyState description="No meals were returned for this person and date range." icon={<ClipboardList aria-hidden="true" className="size-6" />} title="No food logs found" />}
        </section>
      </div>
      <Dialog onClose={() => setEditorOpen(false)} open={editorOpen} title={editingLog ? 'Edit meal' : 'Add a meal'}>
        <FoodLogEditor key={editingLog?.id ?? 'new'} log={editingLog} onSaved={editorSaved} />
      </Dialog>
    </Page>
  )
}
