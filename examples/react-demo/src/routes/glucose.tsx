import { ActivityLevel, Sex, type FoodSearchItem } from '@januaryai/partner-sdk'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Activity, Search, TrendingUp, Utensils } from 'lucide-react'
import { useState } from 'react'
import { getDemoConfiguration, predictGlucose, searchFoods } from '~/api/january.functions'
import {
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Page,
  PageHeader,
  ResultRow,
  SectionLabel,
  SkeletonList,
  TextField,
} from '~/components/ui'
import { cn, formatNumber } from '~/lib/utils'

export const Route = createFileRoute('/glucose')({
  loader: () => getDemoConfiguration(),
  component: GlucosePage,
})

function GlucosePage() {
  const configuration = Route.useLoaderData()
  const [queryDraft, setQueryDraft] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [food, setFood] = useState<FoodSearchItem | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [age, setAge] = useState(42)
  const [sex, setSex] = useState<(typeof Sex)[keyof typeof Sex]>(Sex.female)
  const [height, setHeight] = useState(66)
  const [weight, setWeight] = useState(150)
  const [activityLevel, setActivityLevel] = useState<(typeof ActivityLevel)[keyof typeof ActivityLevel]>(ActivityLevel.moderatelyActive)

  const foodSearch = useQuery({
    queryKey: ['glucose-food-search', submittedQuery],
    queryFn: () => searchFoods({ data: { query: submittedQuery, ...(configuration.defaultEndUserId ? { endUserId: configuration.defaultEndUserId } : {}) } }),
    enabled: submittedQuery.length > 0,
  })

  const prediction = useMutation({
    mutationFn: () => {
      const serving = food?.servings.find((item) => item.isPrimary) ?? food?.servings[0]
      if (!food || !serving) throw new Error('Choose a food with a serving before predicting glucose.')
      return predictGlucose({ data: {
        age,
        sex,
        height,
        weight,
        activityLevel,
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

  return (
    <Page>
      <PageHeader
        description="Compose a meal and send a typed prediction request with a representative profile. Every number shown comes from the SDK response."
        eyebrow="Personalized prediction"
        title="See the curve before the meal."
      />

      <div className="mt-8 grid gap-8 2xl:grid-cols-[minmax(360px,0.78fr)_minmax(0,1.35fr)] 2xl:items-start">
        <div className="space-y-5 2xl:sticky 2xl:top-8">
          <Card className="p-5 sm:p-6">
            <SectionLabel>About you</SectionLabel>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <TextField inputMode="numeric" label="Age" min={18} onChange={(event) => setAge(event.currentTarget.valueAsNumber)} type="number" value={age} />
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-stone-700">Sex</span>
                <select className="min-h-12 w-full rounded-2xl border border-stone-300 bg-white px-4 outline-none focus:border-stone-900" onChange={(event) => setSex(event.target.value as typeof sex)} value={sex}>
                  <option value={Sex.female}>Female</option>
                  <option value={Sex.male}>Male</option>
                </select>
              </label>
              <TextField inputMode="decimal" label="Height (in)" min={36} onChange={(event) => setHeight(event.currentTarget.valueAsNumber)} type="number" value={height} />
              <TextField inputMode="decimal" label="Weight (lb)" min={60} onChange={(event) => setWeight(event.currentTarget.valueAsNumber)} type="number" value={weight} />
            </div>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">Activity level</span>
              <select className="min-h-12 w-full rounded-2xl border border-stone-300 bg-white px-4 outline-none focus:border-stone-900" onChange={(event) => setActivityLevel(event.target.value as typeof activityLevel)} value={activityLevel}>
                <option value={ActivityLevel.sedentary}>Sedentary</option>
                <option value={ActivityLevel.lightlyActive}>Lightly active</option>
                <option value={ActivityLevel.moderatelyActive}>Moderately active</option>
                <option value={ActivityLevel.veryActive}>Very active</option>
              </select>
            </label>
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionLabel>This meal</SectionLabel>
            {food ? (
              <div className="mt-5">
                <div className="flex items-center gap-4">
                  <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#eee8dc]">
                    {food.photoUrl ? <img alt="" className="size-full object-cover" src={food.photoUrl} /> : <Utensils aria-hidden="true" className="size-5 text-stone-600" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{food.name}</div>
                    <div className="mt-1 text-sm text-stone-500">{formatNumber(food.calories, 0)} calories</div>
                  </div>
                  <div className="flex items-center rounded-full border border-stone-300 bg-[#f8f5ed] p-1">
                    <button aria-label="Decrease quantity" className="grid size-10 place-items-center rounded-full text-xl hover:bg-white" disabled={quantity <= 0.25} onClick={() => setQuantity((value) => Math.max(0.25, value - 0.25))} type="button">−</button>
                    <span className="data-number min-w-12 text-center font-bold">{formatNumber(quantity)}</span>
                    <button aria-label="Increase quantity" className="grid size-10 place-items-center rounded-full bg-stone-950 text-xl text-white" onClick={() => setQuantity((value) => value + 0.25)} type="button">+</button>
                  </div>
                </div>
                <button className="mt-4 min-h-11 text-sm font-bold text-amber-800" onClick={() => { setFood(null); prediction.reset() }} type="button">Choose a different food</button>
              </div>
            ) : (
              <form className="mt-5 flex gap-2" onSubmit={(event) => { event.preventDefault(); setSubmittedQuery(queryDraft.trim()) }}>
                <label className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-stone-300 bg-white px-4 focus-within:border-stone-900">
                  <Search aria-hidden="true" className="size-4 text-stone-500" />
                  <span className="sr-only">Search for a food</span>
                  <input className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-stone-400" onChange={(event) => setQueryDraft(event.target.value)} placeholder="Search for a food" value={queryDraft} />
                </label>
                <Button disabled={!queryDraft.trim()} type="submit">Find</Button>
              </form>
            )}
          </Card>

          <Button busy={prediction.isPending} className="w-full" disabled={!food} onClick={() => prediction.mutate()} type="button">
            Predict glucose response
          </Button>
        </div>

        <section aria-live="polite">
          {prediction.isError ? (
            <ErrorMessage error={prediction.error} />
          ) : prediction.data ? (
            <PredictionResult food={food!} quantity={quantity} result={prediction.data} />
          ) : !food && submittedQuery ? (
            <div>
              <div className="mb-4">
                <SectionLabel>Choose a food</SectionLabel>
                <h2 className="mt-2 font-serif text-4xl">Results for “{submittedQuery}”</h2>
              </div>
              {foodSearch.isPending ? <SkeletonList /> : foodSearch.isError ? <ErrorMessage error={foodSearch.error} /> : foodSearch.data ? (
                <Card className="overflow-hidden">
                  {foodSearch.data.items.map((item) => (
                    <ResultRow
                      key={item.id}
                      media={item.photoUrl ? <img alt="" className="size-full object-cover" src={item.photoUrl} /> : <Utensils aria-hidden="true" className="size-5 text-stone-600" />}
                      meta={`${formatNumber(item.calories, 0)} cal · ${item.servings[0] ? `${item.servings[0].quantity} ${item.servings[0].unit}` : 'No serving'}`}
                      onClick={() => { setFood(item); prediction.reset() }}
                      title={item.name}
                    />
                  ))}
                </Card>
              ) : null}
            </div>
          ) : (
            <EmptyState action={<span className="text-sm font-bold text-stone-700">Start by choosing a food</span>} description="Add a food, adjust the representative profile, and request a predicted response through the SDK." icon={<Activity aria-hidden="true" className="size-6" />} title="Build a prediction" />
          )}
        </section>
      </div>
    </Page>
  )
}

function PredictionResult({ food, quantity, result }: { food: FoodSearchItem; quantity: number; result: Awaited<ReturnType<typeof predictGlucose>> }) {
  const peak = result.prediction.reduce((best, point) => point.value > best.value ? point : best, result.prediction[0] ?? { minutes: 0, value: 0 })
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="grid gap-6 border-b border-stone-200 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end lg:p-8">
          <div>
            <SectionLabel>Likely peak</SectionLabel>
            <div className="data-number mt-3 text-6xl font-bold text-[#934426] sm:text-7xl">{formatNumber(peak.value, 0)}</div>
            <div className="mt-2 text-sm font-semibold text-stone-500">mg/dL · about {peak.minutes} minutes after the meal</div>
          </div>
          <span className={cn('w-fit rounded-full px-4 py-2 text-sm font-bold', impactClass(result.impact))}>{friendlyImpact(result.impact)}</span>
        </div>
        <GlucoseChart result={result} />
      </Card>
      <Card className="flex flex-wrap items-center gap-4 p-6">
        <div className="grid size-12 place-items-center rounded-2xl bg-[#eee8dc]"><Utensils aria-hidden="true" className="size-5" /></div>
        <div className="min-w-0 flex-1">
          <SectionLabel>Meal</SectionLabel>
          <div className="mt-1 truncate text-lg font-bold">{food.name}</div>
        </div>
        <div className="data-number text-right text-sm font-bold text-stone-600">{formatNumber(quantity)} × {(food.servings.find((item) => item.isPrimary) ?? food.servings[0])?.unit ?? 'serving'}</div>
      </Card>
      <p className="text-pretty text-sm leading-6 text-stone-500">This is an estimate for demonstration purposes, not medical advice.</p>
    </div>
  )
}

function GlucoseChart({ result }: { result: Awaited<ReturnType<typeof predictGlucose>> }) {
  const points = result.prediction
  const width = 800
  const height = 320
  const insetY = 38
  const minMinute = points[0]?.minutes ?? 0
  const maxMinute = points.at(-1)?.minutes ?? 120
  const minValue = Math.min(result.chart.min, ...points.map((point) => point.value))
  const maxValue = Math.max(result.chart.max, ...points.map((point) => point.value))
  const x = (minutes: number) => ((minutes - minMinute) / Math.max(1, maxMinute - minMinute)) * width
  const y = (value: number) => height - insetY - ((value - minValue) / Math.max(1, maxValue - minValue)) * (height - insetY * 2)
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.minutes)} ${y(point.value)}`).join(' ')
  const peak = points.reduce((best, point) => point.value > best.value ? point : best, points[0] ?? { minutes: 0, value: 0 })

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <SectionLabel>Predicted response</SectionLabel>
        <span className="text-sm font-bold text-stone-500">mg/dL</span>
      </div>
      <svg aria-label="Predicted glucose response over time" className="h-auto w-full overflow-visible" role="img" viewBox={`0 0 ${width} ${height + 38}`}>
        <rect fill="#eef2e7" height={height - insetY * 2} width={width} x="0" y={insetY} />
        {[0, 40, 80, 120].map((minute) => (
          <g key={minute}>
            <line stroke="#d6d3d1" strokeWidth="1" x1={x(minute)} x2={x(minute)} y1={insetY} y2={height - insetY} />
            <text fill="#78716c" fontFamily="DM Sans, sans-serif" fontSize="16" textAnchor={minute === 0 ? 'start' : minute === 120 ? 'end' : 'middle'} x={x(minute)} y={height + 20}>{minute}</text>
          </g>
        ))}
        <path d={`${path} L ${width} ${height - insetY} L 0 ${height - insetY} Z`} fill="#b45d38" fillOpacity="0.12" />
        <path d={path} fill="none" stroke="#a8502f" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
        {points[0] && <circle cx={x(points[0].minutes)} cy={y(points[0].value)} fill="#f5c842" r="9" stroke="#1c1917" strokeWidth="4" />}
        <circle cx={x(peak.minutes)} cy={y(peak.value)} fill="white" r="8" stroke="#1c1917" strokeWidth="4" />
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-stone-600">
        <span className="flex items-center gap-2"><span className="h-0.5 w-6 bg-[#a8502f]" /> Prediction</span>
        <span className="flex items-center gap-2"><span className="size-3 rounded-full border-2 border-stone-950 bg-[#f5c842]" /> Meal</span>
        <span className="flex items-center gap-2"><span className="size-3 bg-[#eef2e7]" /> Target band</span>
      </div>
    </div>
  )
}

function friendlyImpact(value: string) {
  return `${value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())} impact`
}

function impactClass(value: string) {
  if (value.toLowerCase().includes('high')) return 'bg-red-100 text-red-900'
  if (value.toLowerCase().includes('medium')) return 'bg-amber-100 text-amber-950'
  return 'bg-emerald-100 text-emerald-950'
}
