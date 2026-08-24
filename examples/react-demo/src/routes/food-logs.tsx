import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { CalendarDays, ClipboardList, Utensils } from 'lucide-react'
import { useState } from 'react'
import { getDemoConfiguration, listFoodLogs } from '~/api/january.functions'
import {
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Page,
  PageHeader,
  SectionLabel,
  SkeletonList,
  TextField,
} from '~/components/ui'
import { formatNumber, todayInputValue } from '~/lib/utils'

export const Route = createFileRoute('/food-logs')({
  loader: () => getDemoConfiguration(),
  component: FoodLogsPage,
})

function FoodLogsPage() {
  const configuration = Route.useLoaderData()
  const [endUserId, setEndUserId] = useState(configuration.defaultEndUserId)
  const [start, setStart] = useState(todayInputValue(-7))
  const [end, setEnd] = useState(todayInputValue())
  const [request, setRequest] = useState<{ endUserId: string; start: string; end: string } | null>(null)
  const logs = useQuery({
    queryKey: ['food-logs', request],
    queryFn: () => listFoodLogs({ data: { ...request!, endUserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone } }),
    enabled: request !== null,
  })

  return (
    <Page>
      <PageHeader
        description="Load a person’s meal history using the stable partner user ID and a precise date range."
        eyebrow="Partner-owned identity"
        title="Food logs with context."
      />
      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.4fr)] xl:items-start">
        <Card className="p-5 sm:p-6 xl:sticky xl:top-8">
          <SectionLabel>Request</SectionLabel>
          <div className="mt-5 space-y-4">
            <TextField label="End user ID" onChange={(event) => setEndUserId(event.target.value)} placeholder="partner-user-123" value={endUserId} />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <TextField label="From" onChange={(event) => setStart(event.target.value)} type="date" value={start} />
              <TextField label="To" onChange={(event) => setEnd(event.target.value)} type="date" value={end} />
            </div>
          </div>
          <Button className="mt-6 w-full" disabled={!endUserId.trim() || !start || !end} onClick={() => setRequest({ endUserId: endUserId.trim(), start, end })} type="button">
            Load food logs
          </Button>
          <p className="mt-4 text-pretty text-xs leading-5 text-stone-500">The user ID travels as the Partner API end-user header; it is never treated as an API credential.</p>
        </Card>

        <section aria-live="polite">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <SectionLabel>Meal history</SectionLabel>
              <h2 className="mt-2 font-serif text-4xl">{logs.data ? `${logs.data.totalCount} logged meal${logs.data.totalCount === 1 ? '' : 's'}` : 'Choose a date range'}</h2>
            </div>
            <CalendarDays aria-hidden="true" className="size-7 text-stone-400" />
          </div>
          {!request ? (
            <EmptyState description="Enter a stable end-user ID and load a date range to see meal history." icon={<ClipboardList aria-hidden="true" className="size-6" />} title="No request yet" />
          ) : logs.isPending ? (
            <SkeletonList />
          ) : logs.isError ? (
            <ErrorMessage error={logs.error} />
          ) : logs.data?.items.length ? (
            <div className="space-y-4">
              {logs.data.items.map((log) => (
                <Card className="overflow-hidden" key={log.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-4 sm:px-6">
                    <div>
                      <h3 className="text-lg font-bold">{log.name || 'Logged meal'}</h3>
                      <p className="data-number mt-1 text-sm text-stone-500">{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(log.timestampUtc))}</p>
                    </div>
                    <span className="rounded-full bg-[#eee8dc] px-3 py-1.5 text-xs font-bold text-stone-600">{log.foods.length} food{log.foods.length === 1 ? '' : 's'}</span>
                  </div>
                  {log.foods.map((food) => (
                    <div className="flex items-center gap-4 border-b border-stone-200 px-5 py-4 last:border-0 sm:px-6" key={`${log.id}-${food.id}`}>
                      <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#eee8dc]">
                        {food.imageUrl ? <img alt="" className="size-full object-cover" src={food.imageUrl} /> : <Utensils aria-hidden="true" className="size-5 text-stone-600" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-bold">{food.name}</div>
                        <div className="data-number mt-1 text-sm text-stone-500">{formatNumber(food.nutrients.calories?.value, 0)} cal · {formatNumber(food.consumedServing.quantity)} {food.servingDetails.unit}</div>
                      </div>
                    </div>
                  ))}
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState description="No meals were returned for this person and date range." icon={<ClipboardList aria-hidden="true" className="size-6" />} title="No food logs found" />
          )}
        </section>
      </div>
    </Page>
  )
}
