import type { FoodLog } from '@januaryai/partner-sdk'
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
  id: number
  name: string
  servingId: number
  servingUnit: string
  quantity: number
  servings: ServingChoice[]
}

export function FoodLogEditor({ log, onSaved }: { log?: FoodLog; onSaved(): void }) {
  const session = useUserSession()
  const [name, setName] = useState(log?.name ?? '')
  const [timestamp, setTimestamp] = useState(toLocalInput(log?.timestampUtc ? new Date(log.timestampUtc) : new Date()))
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [acceptedSuggestion, setAcceptedSuggestion] = useState<string | null>(null)
  const [foods, setFoods] = useState<SelectedFood[]>(() => log?.foods.map((food) => ({
    id: food.id,
    name: food.name,
    servingId: food.consumedServing.id,
    servingUnit: food.servingDetails.unit,
    quantity: food.consumedServing.quantity,
    servings: [{ id: food.consumedServing.id, quantity: 1, unit: food.servingDetails.unit }],
  })) ?? [])
  const hydratedFood = useHydratedFood()
  const autocomplete = useFoodAutocomplete(query, session.endUserId, acceptedSuggestion)
  const search = useQuery({
    queryKey: ['food-log-food-search', submittedQuery, session.endUserId],
    queryFn: () => searchFoods({ data: { query: submittedQuery, endUserId: session.endUserId } }),
    enabled: Boolean(submittedQuery && session.endUserId),
  })
  const save = useMutation({
    mutationFn: () => saveFoodLog({ data: {
      ...(log ? { logId: log.id } : {}),
      foods: foods.map((food) => ({ id: food.id, serving: { id: food.servingId, quantity: food.quantity } })),
      timestampUtc: new Date(timestamp).toISOString(),
      ...(name.trim() ? { name: name.trim() } : {}),
      endUserId: session.endUserId,
      endUserTimezone: session.endUserTimezone,
    } }),
    onSuccess: onSaved,
  })

  function addFood(food: { id: number }) {
    if (foods.some((item) => item.id === food.id)) return
    hydratedFood.mutate(food, {
      onSuccess: (completeFood) => {
        const serving = completeFood.servings.find((item) => item.isPrimary) ?? completeFood.servings[0]
        if (!serving) return
        setFoods((current) => current.some((item) => item.id === completeFood.id) ? current : [...current, {
          id: completeFood.id,
          name: completeFood.name,
          servingId: serving.id,
          servingUnit: serving.unit,
          quantity: 1,
          servings: completeFood.servings,
        }])
      },
    })
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Meal name (optional)" onChange={(event) => setName(event.target.value)} placeholder="Lunch" value={name} />
        <TextField label="When it was eaten" onChange={(event) => setTimestamp(event.target.value)} type="datetime-local" value={timestamp} />
      </div>
      <Card className="p-5">
        <SectionLabel>Foods in this meal</SectionLabel>
        <p className="mt-2 text-sm leading-6 text-stone-600">Add every food, choose its quantity, then save the complete array once.</p>
        <div className="mt-4 space-y-3">
          {foods.map((food) => <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#f8f5ed] p-3" key={food.id}>
            <div className="grid size-10 place-items-center rounded-xl bg-[#eee8dc]"><Utensils aria-hidden="true" className="size-4" /></div>
            <div className="min-w-40 flex-1"><div className="truncate font-bold">{food.name}</div><div className="text-xs text-stone-500">{food.servingUnit}</div></div>
            <div className="min-w-40"><ServingSelector label="Serving" onChange={(servingId) => setFoods((current) => current.map((item) => item.id === food.id ? { ...item, servingId, servingUnit: item.servings.find((serving) => serving.id === servingId)?.unit ?? item.servingUnit } : item))} servings={food.servings} value={food.servingId} /></div>
            <label className="flex items-center gap-2 text-sm font-semibold"><span>Qty</span><input aria-label={`Quantity for ${food.name}`} className="h-10 w-20 rounded-xl border border-stone-300 bg-white px-3 outline-none transition-colors focus:bg-stone-50" min="0.25" onChange={(event) => setFoods((current) => current.map((item) => item.id === food.id ? { ...item, quantity: event.currentTarget.valueAsNumber } : item))} step="0.25" type="number" value={food.quantity} /></label>
            <button aria-label={`Remove ${food.name}`} className="grid size-10 place-items-center rounded-full hover:bg-white" onClick={() => setFoods((current) => current.filter((item) => item.id !== food.id))} type="button"><Trash2 aria-hidden="true" className="size-4" /></button>
          </div>)}
          {!foods.length && <p className="rounded-2xl border border-dashed border-stone-300 p-4 text-sm text-stone-500">No foods added yet.</p>}
        </div>
      </Card>
      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); const value = query.trim(); setAcceptedSuggestion(value); setSubmittedQuery(value) }}>
        <InputFrame className="flex-1"><Search aria-hidden="true" className="size-4 text-stone-500" /><span className="sr-only">Search foods to add</span><input className="min-w-0 flex-1 bg-transparent outline-none" onChange={(event) => { setQuery(event.target.value); setAcceptedSuggestion(null); setSubmittedQuery('') }} placeholder="Search foods to add" value={query} /></InputFrame>
        <SecondaryButton disabled={!query.trim()} type="submit"><Plus aria-hidden="true" className="size-4" />Find</SecondaryButton>
      </form>
      <FoodSuggestionList
        items={autocomplete.items}
        onSelect={(suggestion) => {
          setQuery(suggestion.name)
          setAcceptedSuggestion(suggestion.name)
          setSubmittedQuery(suggestion.name)
        }}
      />
      {search.isPending && submittedQuery ? <SkeletonList /> : search.isError ? <ErrorMessage error={search.error} /> : search.data?.items.length ? <Card className="max-h-64 overflow-y-auto">{search.data.items.map((food) => <ResultRow busy={hydratedFood.isPending && hydratedFood.variables?.id === food.id} disabled={hydratedFood.isPending || foods.some((item) => item.id === food.id)} key={food.id} media={<NetworkImage alt="" className="size-full" fallback={<Utensils aria-hidden="true" className="size-5" />} src={food.photoUrl} />} meta={`${formatNumber(food.calories, 0)} cal · ${food.servings[0]?.unit ?? 'No serving'}`} onClick={() => addFood(food)} title={foods.some((item) => item.id === food.id) ? `${food.name} · Added` : food.name} />)}</Card> : null}
      {hydratedFood.isError && <ErrorMessage error={hydratedFood.error} />}
      {save.isError && <ErrorMessage error={save.error} />}
      <Button busy={save.isPending} className="w-full" disabled={!foods.length || !session.endUserId || !timestamp} onClick={() => save.mutate()} type="button">{log ? 'Update meal' : 'Create meal'}</Button>
    </div>
  )
}

function toLocalInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
