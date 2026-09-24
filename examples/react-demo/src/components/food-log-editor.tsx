import type { FoodLog } from '@januaryai/web-sdk'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Plus, Search, Trash2, Utensils } from 'lucide-react'
import { useState } from 'react'
import { saveFoodLog, searchFoods } from '~/api/january.functions'
import { useUserSession } from './user-session'
import { NetworkImage } from './network-image'
import { FoodSuggestionList, useFoodAutocomplete } from './food-autocomplete'
import { ServingSelector, type ServingChoice } from './serving-selector'
import { useHydratedFood } from './use-hydrated-food'
import { Button, Card, ErrorMessage, InputFrame, ResultRow, SecondaryButton, SectionLabel, SkeletonList, TextField } from './ui'
import { formatNumber } from '~/lib/utils'

interface SelectedFood {
  id: string
  name: string
  servingId: string
  servingUnit: string
  quantity: number
  servings: ServingChoice[]
}

/** `defaultTimestamp` is when a new meal was eaten unless changed; it defaults to now. */
export function FoodLogEditor({ log, defaultTimestamp, onSaved }: { log?: FoodLog; defaultTimestamp?: string; onSaved(): void }) {
  const session = useUserSession()
  const [name, setName] = useState(log?.name ?? '')
  const [timestamp, setTimestamp] = useState(toLocalInput(new Date(log?.timestampUtc ?? defaultTimestamp ?? Date.now())))
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [acceptedSuggestion, setAcceptedSuggestion] = useState<string | null>(null)
  const [foods, setFoods] = useState<SelectedFood[]>(() => log?.foods.flatMap((food) => {
    const id = food.id
    const servingId = food.consumedServing.id
    if (!id || !servingId) return []
    return [{
      id,
      name: food.name ?? 'Unnamed food',
      servingId,
      servingUnit: food.servingDetails.unit ?? 'serving',
      // A number of servings; the serving option keeps its own size ("6 oz", not "1 oz").
      quantity: food.consumedServing.quantity ?? 1,
      servings: [{ id: servingId, quantity: food.servingDetails.quantity, unit: food.servingDetails.unit ?? 'serving' }],
    }]
  }) ?? [])
  const hydratedFood = useHydratedFood()
  const autocomplete = useFoodAutocomplete(query, session.endUserId, acceptedSuggestion)
  const search = useQuery({
    queryKey: ['food-log-food-search', submittedQuery, session.endUserId],
    queryFn: () => searchFoods({ data: { query: submittedQuery, endUserId: session.endUserId } }),
    enabled: Boolean(submittedQuery && session.endUserId),
  })
  const save = useMutation({
    mutationFn: () => saveFoodLog({ data: {
      ...(log?.id ? { logId: log.id } : {}),
      foods: foods.map((food) => ({ id: food.id, serving: { id: food.servingId, quantity: food.quantity } })),
      timestampUtc: new Date(timestamp).toISOString(),
      ...(name.trim() ? { name: name.trim() } : {}),
      endUserId: session.endUserId,
      endUserTimezone: session.endUserTimezone,
    } }),
    onSuccess: onSaved,
  })

  function addFood(food: { id: string }) {
    if (foods.some((item) => item.id === food.id)) return
    hydratedFood.mutate(food, {
      onSuccess: (completeFood) => {
        const serving = completeFood.servings.find((item) => item.isPrimary) ?? completeFood.servings[0]
        if (!serving?.id) return
        const servingId = serving.id
        setFoods((current) => current.some((item) => item.id === completeFood.id) ? current : [...current, {
          id: completeFood.id,
          name: completeFood.name ?? 'Unnamed food',
          servingId,
          servingUnit: serving.unit ?? 'serving',
          quantity: 1,
          servings: completeFood.servings,
        }])
      },
    })
  }

  return (
    <div className="space-y-5" data-testid="food-log-editor">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField data-testid="food-log-name" label="Meal name (optional)" onChange={(event) => setName(event.target.value)} placeholder="Lunch" value={name} />
        <TextField data-testid="food-log-time" label="When it was eaten" onChange={(event) => setTimestamp(event.target.value)} type="datetime-local" value={timestamp} />
      </div>
      <Card className="p-5">
        <SectionLabel>Foods in this meal</SectionLabel>
        <p className="mt-2 text-sm leading-6 text-stone-600">Add every food, choose its quantity, then save the complete array once.</p>
        <div className="mt-4 space-y-3">
          {foods.map((food, index) => <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#f8f5ed] p-3" data-testid={`food-log-food-${index}`} key={food.id}>
            <div className="grid size-10 place-items-center rounded-xl bg-[#eee8dc]"><Utensils aria-hidden="true" className="size-4" /></div>
            <div className="min-w-40 flex-1"><div className="truncate font-bold">{food.name}</div><div className="text-xs text-stone-500">{food.servingUnit}</div></div>
            <div className="min-w-40"><ServingSelector label="Serving" testId="food-log-food-serving" onChange={(servingId) => setFoods((current) => current.map((item) => item.id === food.id ? { ...item, servingId, servingUnit: item.servings.find((serving) => serving.id === servingId)?.unit ?? item.servingUnit } : item))} servings={food.servings} value={food.servingId} /></div>
            <label className="flex items-center gap-2 text-sm font-semibold"><span>Qty</span><input aria-label={`Quantity for ${food.name}`} data-testid="food-log-food-quantity" className="h-10 w-20 rounded-xl border border-stone-300 bg-white px-3 outline-none transition-colors focus:bg-stone-50" min="0.25" onChange={(event) => {
              // Read the value now: React clears currentTarget before a state updater runs.
              const quantity = event.currentTarget.valueAsNumber
              setFoods((current) => current.map((item) => item.id === food.id ? { ...item, quantity } : item))
            }} step="0.25" type="number" value={Number.isFinite(food.quantity) ? food.quantity : ''} /></label>
            <button aria-label={`Remove ${food.name}`} data-testid="food-log-food-remove" className="grid size-10 place-items-center rounded-full hover:bg-white" onClick={() => setFoods((current) => current.filter((item) => item.id !== food.id))} type="button"><Trash2 aria-hidden="true" className="size-4" /></button>
          </div>)}
          {!foods.length && <p className="rounded-2xl border border-dashed border-stone-300 p-4 text-sm text-stone-500" data-testid="food-log-editor-empty">No foods added yet.</p>}
        </div>
      </Card>
      <form className="flex gap-2" data-testid="food-picker" onSubmit={(event) => { event.preventDefault(); const value = query.trim(); setAcceptedSuggestion(value); setSubmittedQuery(value) }}>
        <InputFrame className="flex-1"><Search aria-hidden="true" className="size-4 text-stone-500" /><span className="sr-only">Search foods to add</span><input className="min-w-0 flex-1 bg-transparent outline-none" data-testid="food-picker-input" onChange={(event) => { setQuery(event.target.value); setAcceptedSuggestion(null); setSubmittedQuery('') }} placeholder="Search foods to add" value={query} /></InputFrame>
        <SecondaryButton data-testid="food-log-add-food" disabled={!query.trim()} type="submit"><Plus aria-hidden="true" className="size-4" />Find</SecondaryButton>
      </form>
      <FoodSuggestionList
        itemTestIdPrefix="food-picker-suggestion"
        items={autocomplete.items}
        onSelect={(suggestion) => {
          const name = suggestion.name ?? ''
          setQuery(name)
          setAcceptedSuggestion(name)
          setSubmittedQuery(name)
        }}
        testId="food-picker-suggestions"
      />
      {search.isPending && submittedQuery ? <SkeletonList testId="food-picker-loading" /> : search.isError ? <ErrorMessage error={search.error} testId="food-picker-error" /> : search.data?.items.length ? <Card className="max-h-64 overflow-y-auto" data-testid="food-picker-results">{search.data.items.map((food, index) => <ResultRow busy={hydratedFood.isPending && hydratedFood.variables?.id === food.id} disabled={hydratedFood.isPending || foods.some((item) => item.id === food.id)} key={food.id} media={<NetworkImage alt="" className="size-full" fallback={<Utensils aria-hidden="true" className="size-5" />} src={food.photoUrl} />} meta={`${formatNumber(food.calories, 0)} cal · ${food.servings[0]?.unit ?? 'No serving'}`} onClick={() => addFood(food)} testId={`food-picker-result-${index}`} title={foods.some((item) => item.id === food.id) ? `${food.name ?? 'Unnamed food'} · Added` : food.name ?? 'Unnamed food'} />)}</Card> : null}
      {hydratedFood.isError && <ErrorMessage error={hydratedFood.error} testId="food-picker-error" />}
      {save.isError && <ErrorMessage error={save.error} testId="food-log-save-error" />}
      <Button busy={save.isPending} busyTestId="food-log-save-loading" className="w-full" data-testid="food-log-save" disabled={!foods.length || foods.some((food) => !(food.quantity > 0)) || !session.endUserId || !timestamp} onClick={() => save.mutate()} type="button">{log ? 'Update meal' : 'Create meal'}</Button>
    </div>
  )
}

function toLocalInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
