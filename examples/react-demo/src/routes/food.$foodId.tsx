import { ActivityLevel, FoodPortion, Sex, type FoodSearchItem, type ServingOption } from '@januaryai/partner-sdk'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Activity, ArrowLeft, Utensils } from 'lucide-react'
import { useState } from 'react'
import { getDemoConfiguration, getFoodDetails, predictGlucose } from '~/api/january.functions'
import { FoodMacroGrid, FoodNutritionFacts } from '~/components/food-detail-nutrition'
import { FoodPredictionPanel } from '~/components/food-prediction-panel'
import { NetworkImage } from '~/components/network-image'
import { QuantityControl } from '~/components/quantity-control'
import { Button, Card, ErrorMessage, Page, SectionLabel, SkeletonList } from '~/components/ui'
import { formatNumber } from '~/lib/utils'

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
  const id = Number(foodId)
  const food = useQuery({
    queryKey: ['food-detail', id],
    queryFn: () => getFoodDetails({ data: {
      foodId: id,
      ...(configuration.defaultEndUserId ? { endUserId: configuration.defaultEndUserId } : {}),
    } }),
    enabled: Number.isInteger(id) && id > 0,
  })

  return (
    <Page>
      <Link className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 hover:bg-stone-50" search={upc ? {} : { q }} to={upc ? '/scan' : '/search'}>
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to results
      </Link>
      {food.isPending ? <div className="mt-6"><SkeletonList /></div> : food.isError ? <div className="mt-6"><ErrorMessage error={food.error} /></div> : (
        <FoodDetailContent configuration={configuration} food={food.data} />
      )}
    </Page>
  )
}

function FoodDetailContent({ food, configuration }: { food: FoodSearchItem; configuration: Awaited<ReturnType<typeof getDemoConfiguration>> }) {
  const initialServing = food.servings.find((item) => item.isPrimary) ?? food.servings[0] ?? null
  const [servingId, setServingId] = useState(initialServing?.id ?? 0)
  const [quantity, setQuantity] = useState(initialServing?.quantity ?? 1)
  const serving = food.servings.find((item) => item.id === servingId) ?? initialServing
  const portion = serving ? FoodPortion.from(food, { servingId: serving.id, quantity }) : null
  const prediction = useMutation({
    mutationFn: () => {
      if (!serving) throw new Error('Choose a serving before predicting glucose.')
      return predictGlucose({ data: {
        age: 42,
        sex: Sex.female,
        height: 66,
        weight: 150,
        activityLevel: ActivityLevel.moderatelyActive,
        healthConditions: [],
        foodId: food.id,
        servingId: serving.id,
        quantity,
        startTime: new Date().toISOString(),
        endUserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(configuration.defaultEndUserId ? { endUserId: configuration.defaultEndUserId } : {}),
      } })
    },
  })

  function chooseServing(id: number) {
    const next = food.servings.find((item) => item.id === id)
    if (!next) return
    setServingId(next.id)
    setQuantity(next.quantity || 1)
    prediction.reset()
  }

  function changeQuantity(next: number) {
    setQuantity(Math.min(100, Math.max(0.25, next)))
    prediction.reset()
  }

  return (
    <div className="mt-6 grid gap-7 xl:grid-cols-[minmax(0,0.8fr)_minmax(420px,1.2fr)] xl:items-start">
      <div className="space-y-6 xl:sticky xl:top-8">
        <NetworkImage alt="" className="aspect-[16/10] w-full rounded-3xl border border-stone-300" fallback={<Utensils aria-hidden="true" className="size-14 text-[var(--app-positive)]" />} src={food.photoUrl} />
        <div>
          <SectionLabel>Food details</SectionLabel>
          <h1 className="mt-3 text-balance font-serif text-5xl leading-none sm:text-6xl">{food.name}</h1>
          {food.brandName && <p className="mt-3 text-lg text-stone-500">{food.brandName}</p>}
        </div>

        <Card className="p-5 sm:p-6">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-stone-700">Serving</span>
            <select className="min-h-14 w-full rounded-2xl border border-stone-300 bg-white px-4 font-bold outline-none transition-colors focus:bg-stone-50" disabled={!food.servings.length} onChange={(event) => chooseServing(Number(event.target.value))} value={servingId}>
              {food.servings.map((option) => <option key={option.id} value={option.id}>{servingLabel(option)}</option>)}
            </select>
          </label>
          <div className="mt-5 flex items-center justify-between gap-4 border-t border-stone-200 pt-5">
            <div>
              <SectionLabel>Quantity</SectionLabel>
              <div className="data-number mt-1 text-3xl font-bold">{formatNumber(quantity)} <span className="text-base font-medium text-stone-500">{serving?.unit}</span></div>
            </div>
            <QuantityControl decreaseDisabled={quantity <= 0.25} onDecrease={() => changeQuantity(quantity - 0.25)} onIncrease={() => changeQuantity(quantity + 0.25)} value={formatNumber(quantity)} />
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <FoodMacroGrid portion={portion} />
        <FoodNutritionFacts portion={portion} />
        <Button busy={prediction.isPending} className="w-full" disabled={!serving || prediction.isPending} onClick={() => prediction.mutate()}>
          <Activity aria-hidden="true" className="size-5" /> {prediction.isPending ? 'Predicting response…' : 'Check glucose'}
        </Button>
        {prediction.isError && <ErrorMessage error={prediction.error} />}
        {prediction.data && <FoodPredictionPanel food={food} quantity={quantity} serving={serving!} result={prediction.data} />}
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
