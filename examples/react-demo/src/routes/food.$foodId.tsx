import { ActivityLevel, FoodPortion, Sex, type FoodSearchItem, type ServingOption } from '@januaryai/partner-sdk'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Activity, ArrowLeft, Minus, Plus, Utensils } from 'lucide-react'
import { useState } from 'react'
import { getDemoConfiguration, getFoodDetails, predictGlucose } from '~/api/january.functions'
import { GlucoseChart, friendlyImpact, impactClass } from '~/components/glucose-prediction'
import { Button, Card, ErrorMessage, Page, SectionLabel, SkeletonList } from '~/components/ui'
import { cn, formatNumber } from '~/lib/utils'

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
        <div className="overflow-hidden rounded-3xl border border-stone-300 bg-[#eee8dc]">
          {food.photoUrl ? <img alt="" className="aspect-[16/10] w-full object-cover" src={food.photoUrl} /> : (
            <div className="grid aspect-[16/10] place-items-center"><Utensils aria-hidden="true" className="size-14 text-[#557653]" /></div>
          )}
        </div>
        <div>
          <SectionLabel>Food details</SectionLabel>
          <h1 className="mt-3 text-balance font-serif text-5xl leading-none sm:text-6xl">{food.name}</h1>
          {food.brandName && <p className="mt-3 text-lg text-stone-500">{food.brandName}</p>}
        </div>

        <Card className="p-5 sm:p-6">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-stone-700">Serving</span>
            <select className="min-h-14 w-full rounded-2xl border border-stone-300 bg-white px-4 font-bold outline-none focus:border-stone-900" disabled={!food.servings.length} onChange={(event) => chooseServing(Number(event.target.value))} value={servingId}>
              {food.servings.map((option) => <option key={option.id} value={option.id}>{servingLabel(option)}</option>)}
            </select>
          </label>
          <div className="mt-5 flex items-center justify-between gap-4 border-t border-stone-200 pt-5">
            <div>
              <SectionLabel>Quantity</SectionLabel>
              <div className="data-number mt-1 text-3xl font-bold">{formatNumber(quantity)} <span className="text-base font-medium text-stone-500">{serving?.unit}</span></div>
            </div>
            <div className="flex items-center gap-2">
              <button aria-label="Decrease quantity" className="grid size-12 place-items-center rounded-full border border-stone-300 bg-white hover:bg-stone-50" onClick={() => changeQuantity(quantity - 0.25)} type="button"><Minus aria-hidden="true" className="size-5" /></button>
              <button aria-label="Increase quantity" className="grid size-12 place-items-center rounded-full bg-stone-950 text-white hover:bg-stone-800" onClick={() => changeQuantity(quantity + 0.25)} type="button"><Plus aria-hidden="true" className="size-5" /></button>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <MacroGrid portion={portion} />
        <NutritionFacts portion={portion} />
        <Button busy={prediction.isPending} className="w-full" disabled={!serving || prediction.isPending} onClick={() => prediction.mutate()}>
          <Activity aria-hidden="true" className="size-5" /> {prediction.isPending ? 'Predicting response…' : 'Check glucose'}
        </Button>
        {prediction.isError && <ErrorMessage error={prediction.error} />}
        {prediction.data && <PredictionPanel food={food} quantity={quantity} serving={serving!} result={prediction.data} />}
      </div>
    </div>
  )
}

function MacroGrid({ portion }: { portion: FoodPortion | null }) {
  const macros: Array<[string, number | undefined, string]> = [
    ['Calories', portion?.nutrition.calories?.value, 'cal'],
    ['Protein', portion?.nutrition.protein?.value, 'g'],
    ['Carbs', portion?.nutrition.carbohydrates?.value, 'g'],
    ['Fat', portion?.nutrition.totalFat?.value, 'g'],
  ]
  return (
    <Card className="grid grid-cols-2 gap-px overflow-hidden bg-stone-200 sm:grid-cols-4">
      {macros.map(([label, value, unit]) => (
        <div className="bg-white p-5 text-center" key={label}>
          <div className="data-number text-2xl font-bold">{value == null ? '—' : formatNumber(value)}</div>
          <div className="mt-1 text-xs font-bold uppercase text-stone-500">{unit} · {label}</div>
        </div>
      ))}
    </Card>
  )
}

function NutritionFacts({ portion }: { portion: FoodPortion | null }) {
  const rows: Array<[string, number | null | undefined, string]> = [
    ['Net carbohydrates', portion?.nutrition.netCarbohydrates?.value, 'g'],
    ['Saturated fat', portion?.nutrition.saturatedFat?.value, 'g'],
    ['Fiber', portion?.nutrition.fiber?.value, 'g'],
    ['Total sugars', portion?.nutrition.totalSugars?.value, 'g'],
    ['Added sugars', portion?.nutrition.addedSugars?.value, 'g'],
    ['Sodium', portion?.nutrition.sodium?.value, 'mg'],
    ['Potassium', portion?.nutrition.potassium?.value, 'mg'],
    ['Cholesterol', portion?.nutrition.cholesterol?.value, 'mg'],
    ['Glycemic index', portion?.glycemicIndex, ''],
    ['Glycemic load', portion?.glycemicLoad, ''],
  ]
  const available = rows.filter(([, value]) => value != null)
  return (
    <Card className="overflow-hidden">
      <div className="p-5 sm:p-6"><h2 className="font-serif text-3xl">Nutrition facts</h2></div>
      {available.length ? available.map(([label, value, unit]) => (
        <div className="flex items-center justify-between gap-4 border-t border-stone-200 px-5 py-4 sm:px-6" key={label}>
          <span className="font-semibold">{label}</span>
          <span className="data-number text-stone-500">{formatNumber(value ?? 0)}{unit ? ` ${unit}` : ''}</span>
        </div>
      )) : <p className="border-t border-stone-200 p-6 text-stone-500">No additional nutrients were returned.</p>}
    </Card>
  )
}

function PredictionPanel({ food, quantity, serving, result }: { food: FoodSearchItem; quantity: number; serving: ServingOption; result: Awaited<ReturnType<typeof predictGlucose>> }) {
  const peak = result.prediction.reduce((best, point) => point.value > best.value ? point : best, result.prediction[0] ?? { minutes: 0, value: 0 })
  return (
    <Card className="overflow-hidden">
      <div className="grid gap-5 border-b border-stone-200 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <SectionLabel>Likely peak</SectionLabel>
          <div className="data-number mt-2 text-6xl font-bold text-[#934426]">{formatNumber(peak.value, 0)}</div>
          <p className="mt-2 text-sm font-semibold text-stone-500">mg/dL · about {formatNumber(peak.minutes, 0)} minutes after {formatNumber(quantity)} {serving.unit}</p>
        </div>
        <span className={cn('w-fit rounded-full px-4 py-2 text-sm font-bold', impactClass(result.impact))}>{friendlyImpact(result.impact)}</span>
      </div>
      <GlucoseChart result={result} />
      <div className="border-t border-stone-200 px-6 py-4 text-sm text-stone-500">Prediction for {food.name}. This estimate is for demonstration purposes, not medical advice.</div>
    </Card>
  )
}

function servingLabel(serving: ServingOption) {
  return [
    `${formatNumber(serving.quantity)} ${serving.unit}`,
    serving.weightGrams == null ? null : `${formatNumber(serving.weightGrams)} g`,
  ].filter(Boolean).join(' · ')
}
