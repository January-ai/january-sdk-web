import { ActivityLevel, FoodPortion, Sex, type FoodSearchItem, type ServingOption } from '@januaryai/web-sdk'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Activity, ArrowLeft, Check, Plus, Utensils } from 'lucide-react'
import { useState } from 'react'
import { getDemoConfiguration, getFoodDetails, predictGlucose, saveFoodLog } from '~/api/january.functions'
import { FoodAlternatives } from '~/components/food-alternatives'
import { FoodMacroGrid, FoodNutritionFacts } from '~/components/food-detail-nutrition'
import { FoodPredictionPanel } from '~/components/food-prediction-panel'
import { NetworkImage } from '~/components/network-image'
import { QuantityControl } from '~/components/quantity-control'
import { Button, Card, ErrorMessage, Page, SectionLabel, SkeletonList } from '~/components/ui'
import { useUserSession } from '~/components/user-session'
import { formatNumber, formatQuantity } from '~/lib/utils'

interface FoodDetailSearch {
  q: string
  upc?: string
}

export const Route = createFileRoute('/food/$foodId')({
  validateSearch: (search: Record<string, unknown>): FoodDetailSearch => ({
    q: typeof search.q === 'string' ? search.q : '',
    ...(typeof search.upc === 'string' && search.upc ? { upc: search.upc } : {}),
  }),
  loader: () => getDemoConfiguration(),
  component: FoodDetailPage,
})

function FoodDetailPage() {
  const { foodId } = Route.useParams()
  const { q, upc } = Route.useSearch()
  const configuration = Route.useLoaderData()
  const id = foodId.trim()
  const food = useQuery({
    queryKey: ['food-detail', id],
    queryFn: () => getFoodDetails({ data: {
      foodId: id,
      ...(configuration.defaultEndUserId ? { endUserId: configuration.defaultEndUserId } : {}),
    } }),
    enabled: id.length > 0,
  })

  return (
    <Page data-testid="food-detail-screen">
      <Link className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 hover:bg-stone-50" data-testid="food-detail-back" search={upc ? {} : { q }} to={upc ? '/scan' : '/search'}>
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to results
      </Link>
      {food.isPending ? <div className="mt-6"><SkeletonList testId="food-detail-loading" /></div> : food.isError ? <div className="mt-6"><ErrorMessage error={food.error} onRetry={() => void food.refetch()} retryTestId="food-detail-retry" testId="food-detail-error" /></div> : (
        // Keyed by food, so opening an alternative starts from that food's own serving.
        <FoodDetailContent configuration={configuration} food={food.data} key={food.data.id} />
      )}
    </Page>
  )
}

function FoodDetailContent({ food, configuration }: { food: FoodSearchItem; configuration: Awaited<ReturnType<typeof getDemoConfiguration>> }) {
  const initialServing = food.servings.find((item) => item.id && item.isPrimary) ?? food.servings.find((item) => item.id) ?? null
  const [servingId, setServingId] = useState(initialServing?.id ?? '')
  const [quantity, setQuantity] = useState(initialServing?.quantity ?? 1)
  const serving = food.servings.find((item) => item.id === servingId) ?? initialServing
  const portion = serving?.id ? FoodPortion.from(food, { servingId: serving.id, quantity }) : null
  const prediction = useMutation({
    mutationFn: () => {
      if (!portion) throw new Error('Choose a serving before predicting glucose.')
      // `quantity` is the amount in the serving's unit (6 for "6 oz"); the selection counts servings.
      const { selection } = portion
      return predictGlucose({ data: {
        age: 42,
        sex: Sex.female,
        height: 66,
        weight: 150,
        activityLevel: ActivityLevel.moderatelyActive,
        healthConditions: [],
        foodId: selection.id,
        servingId: selection.serving.id,
        quantity: selection.serving.quantity,
        startTime: new Date().toISOString(),
        endUserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(configuration.defaultEndUserId ? { endUserId: configuration.defaultEndUserId } : {}),
      } })
    },
  })

  const session = useUserSession()
  const queryClient = useQueryClient()
  // Logs the portion shown, now, for the demo's user: `portion.selection` is ready for foodLogs.create.
  const logPortion = useMutation({
    mutationFn: () => {
      if (!portion) throw new Error('Choose a serving before logging this food.')
      return saveFoodLog({ data: {
        foods: [portion.selection],
        timestampUtc: new Date().toISOString(),
        ...(food.name?.trim() ? { name: food.name.trim().slice(0, 120) } : {}),
        endUserId: session.endUserId,
        endUserTimezone: session.endUserTimezone,
      } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-logs'] })
      queryClient.invalidateQueries({ queryKey: ['food-log-summary'] })
    },
  })

  function chooseServing(id: string) {
    const next = food.servings.find((item) => item.id === id)
    if (!next?.id) return
    setServingId(next.id)
    setQuantity(next.quantity || 1)
    prediction.reset()
    logPortion.reset()
  }

  function changeQuantity(next: number) {
    setQuantity(Math.min(100, Math.max(0.25, next)))
    prediction.reset()
    logPortion.reset()
  }

  return (
    <div className="mt-6 grid gap-7 xl:grid-cols-[minmax(0,0.8fr)_minmax(420px,1.2fr)] xl:items-start">
      <div className="space-y-6 xl:sticky xl:top-8">
        <NetworkImage alt="" className="aspect-[16/10] w-full rounded-3xl border border-stone-300" fallback={<Utensils aria-hidden="true" className="size-14 text-[var(--app-positive)]" />} src={food.photoUrl} />
        <div>
          <SectionLabel>Food details</SectionLabel>
          <h1 className="mt-3 text-balance font-serif text-5xl leading-none sm:text-6xl">{food.name ?? 'Unnamed food'}</h1>
          {food.brandName && <p className="mt-3 text-lg text-stone-500">{food.brandName}</p>}
        </div>

        <Card className="p-5 sm:p-6">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-stone-700">Serving</span>
            <select className="min-h-14 w-full rounded-2xl border border-stone-300 bg-white px-4 font-bold outline-none transition-colors focus:bg-stone-50" data-testid="food-serving-unit" disabled={!food.servings.some((option) => option.id)} onChange={(event) => chooseServing(event.target.value)} value={servingId}>
              {food.servings.filter((option) => option.id).map((option) => <option key={option.id} value={option.id!}>{servingLabel(option)}</option>)}
            </select>
          </label>
          <div className="mt-5 flex items-center justify-between gap-4 border-t border-stone-200 pt-5">
            <div>
              <SectionLabel>Quantity</SectionLabel>
              <div className="data-number mt-1 text-3xl font-bold">{formatQuantity(quantity)} <span className="text-base font-medium text-stone-500">{serving?.unit}</span></div>
            </div>
            <QuantityControl decreaseDisabled={quantity <= 0.25} onDecrease={() => changeQuantity(quantity - 0.25)} onIncrease={() => changeQuantity(quantity + 0.25)} testId="food-serving-controls" value={formatQuantity(quantity)} />
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <FoodMacroGrid portion={portion} />
        <FoodNutritionFacts portion={portion} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Button busy={logPortion.isPending} busyTestId="food-log-portion-loading" className="w-full border border-stone-300 bg-white text-stone-800 hover:bg-stone-50" data-testid="food-log-portion" disabled={!portion || !session.endUserId || logPortion.isPending} onClick={() => logPortion.mutate()} title={session.endUserId ? undefined : 'Set a user in Settings to log food.'} type="button">
            <Plus aria-hidden="true" className="size-5" /> {logPortion.isPending ? 'Logging…' : 'Log this portion'}
          </Button>
          <Button busy={prediction.isPending} busyTestId="food-glucose-loading" className="w-full" data-testid="food-check-glucose" disabled={!serving || prediction.isPending} onClick={() => prediction.mutate()}>
            <Activity aria-hidden="true" className="size-5" /> {prediction.isPending ? 'Predicting response…' : 'Check glucose'}
          </Button>
        </div>
        {logPortion.isError && <ErrorMessage error={logPortion.error} testId="food-log-portion-error" />}
        {logPortion.isSuccess && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-950" data-testid="food-log-portion-saved">
            <Check aria-hidden="true" className="size-4" />
            <span>Logged {formatQuantity(quantity)} {serving?.unit ?? 'serving'}.</span>
            <Link className="underline underline-offset-2" data-testid="food-log-portion-view" to="/tracking">See it in Tracking</Link>
          </p>
        )}
        {prediction.isError && <ErrorMessage error={prediction.error} testId="food-glucose-error" />}
        {prediction.data && <FoodPredictionPanel food={food} quantity={quantity} serving={serving!} result={prediction.data} />}
        <FoodAlternatives food={food} {...(configuration.defaultEndUserId ? { endUserId: configuration.defaultEndUserId } : {})} />
      </div>
    </div>
  )
}

function servingLabel(serving: ServingOption) {
  return [
    `${formatNumber(serving.quantity)} ${serving.unit}`,
    serving.weightGrams == null ? null : `${formatNumber(serving.weightGrams)} g`,
  ].filter(Boolean).join(' · ')
}
