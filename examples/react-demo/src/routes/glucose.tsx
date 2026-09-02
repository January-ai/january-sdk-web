import { ActivityLevel, Sex, type FoodSearchItem } from '@januaryai/web-sdk'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Activity, Search, Utensils } from 'lucide-react'
import { useState } from 'react'
import { predictGlucose, searchFoods } from '~/api/january.functions'
import { UserContextCard } from '~/components/user-context-card'
import { useUserSession } from '~/components/user-session'
import { WorkflowGuide } from '~/components/workflow-guide'
import { FoodSuggestionList, useFoodAutocomplete } from '~/components/food-autocomplete'
import { NetworkImage } from '~/components/network-image'
import { QuantityControl } from '~/components/quantity-control'
import { ServingSelector } from '~/components/serving-selector'
import { useHydratedFood } from '~/components/use-hydrated-food'
import {
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  InputFrame,
  Page,
  PageHeader,
  ResultRow,
  SectionLabel,
  SkeletonList,
  TextField,
} from '~/components/ui'
import { cn, formatNumber } from '~/lib/utils'
import { GlucoseChart, friendlyImpact, impactClass } from '~/components/glucose-prediction'
import { HeightInput } from '~/components/height-input'
import { WeightInput } from '~/components/weight-input'

export const Route = createFileRoute('/glucose')({
  component: GlucosePage,
})

function GlucosePage() {
  const session = useUserSession()
  const [queryDraft, setQueryDraft] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [acceptedSuggestion, setAcceptedSuggestion] = useState<string | null>(null)
  const [food, setFood] = useState<FoodSearchItem | null>(null)
  const [servingId, setServingId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [age, setAge] = useState(42)
  const [sex, setSex] = useState<(typeof Sex)[keyof typeof Sex]>(Sex.female)
  const [height, setHeight] = useState(66)
  const [weight, setWeight] = useState(150)
  const [activityLevel, setActivityLevel] = useState<(typeof ActivityLevel)[keyof typeof ActivityLevel]>(ActivityLevel.moderatelyActive)

  const foodSearch = useQuery({
    queryKey: ['glucose-food-search', submittedQuery],
    queryFn: () => searchFoods({ data: { query: submittedQuery, ...(session.endUserId ? { endUserId: session.endUserId } : {}) } }),
    enabled: submittedQuery.length > 0,
  })
  const hydratedFood = useHydratedFood()
  const autocomplete = useFoodAutocomplete(queryDraft, session.endUserId, acceptedSuggestion)

  const prediction = useMutation({
    mutationFn: () => {
      const serving = food?.servings.find((item) => item.id === servingId)
      if (!food || !serving?.id) throw new Error('Choose a food with a serving before predicting glucose.')
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
        endUserTimezone: session.endUserTimezone,
        endUserId: session.endUserId,
      } })
    },
  })

  function chooseFood(candidate: { id: string }) {
    hydratedFood.mutate(candidate, { onSuccess: (completeFood) => {
      const serving = completeFood.servings.find((option) => option.isPrimary) ?? completeFood.servings[0]
      if (!serving?.id) return
      const servingId = serving.id
      setFood(completeFood)
      setServingId(servingId)
      setQuantity(1)
      prediction.reset()
    } })
  }

  return (
    <Page>
      <PageHeader
        description="Build a representative profile, choose what the person plans to eat, then ask January for a personalized estimate. Every result comes from the scoped SDK response."
        eyebrow="Personalized prediction"
        title="See the curve before the meal."
      />

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <WorkflowGuide
          steps={[
            { title: 'Profile', description: 'Age, body measurements, and activity change the estimate.' },
            { title: 'Meal', description: 'The selected serving and quantity describe what will be eaten.' },
            { title: 'Prediction', description: 'January returns the curve, likely peak, and impact label.' },
          ]}
          title="How prediction works"
        />
        <UserContextCard description="This same app-owned user and timezone are reused for personalized glucose requests." />
      </div>

      <div className="mt-8 grid gap-8 2xl:grid-cols-[minmax(360px,0.78fr)_minmax(0,1.35fr)] 2xl:items-start">
        <div className="space-y-5 2xl:sticky 2xl:top-8">
          <Card className="p-5 sm:p-6">
            <SectionLabel>About you</SectionLabel>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <TextField inputMode="numeric" label="Age" min={18} onChange={(event) => setAge(event.currentTarget.valueAsNumber)} type="number" value={age} />
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-stone-700">Sex</span>
                <select className="min-h-12 w-full rounded-2xl border border-stone-300 bg-white px-4 outline-none transition-colors focus:bg-stone-50" onChange={(event) => setSex(event.target.value as typeof sex)} value={sex}>
                  <option value={Sex.female}>Female</option>
                  <option value={Sex.male}>Male</option>
                </select>
              </label>
              <HeightInput className="col-span-2" heightInches={height} onHeightInchesChange={setHeight} />
              <WeightInput className="col-span-2" weightPounds={weight} onWeightPoundsChange={setWeight} />
            </div>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">Activity level</span>
              <select className="min-h-12 w-full rounded-2xl border border-stone-300 bg-white px-4 outline-none transition-colors focus:bg-stone-50" onChange={(event) => setActivityLevel(event.target.value as typeof activityLevel)} value={activityLevel}>
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
                  <NetworkImage alt="" className="size-14 shrink-0 rounded-2xl" fallback={<Utensils aria-hidden="true" className="size-5 text-stone-600" />} src={food.photoUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{food.name}</div>
                    <div className="mt-1 text-sm text-stone-500">{formatNumber(food.calories, 0)} calories</div>
                  </div>
                  <QuantityControl decreaseDisabled={quantity <= 0.25} onDecrease={() => setQuantity((value) => Math.max(0.25, value - 0.25))} onIncrease={() => setQuantity((value) => value + 0.25)} value={formatNumber(quantity)} />
                </div>
                {servingId != null && <div className="mt-4"><ServingSelector onChange={(value) => { setServingId(value); prediction.reset() }} servings={food.servings} value={servingId} /></div>}
                <button className="mt-4 min-h-11 text-sm font-bold text-amber-800" onClick={() => { setFood(null); setServingId(null); prediction.reset() }} type="button">Choose a different food</button>
              </div>
            ) : (
              <form className="mt-5 flex gap-2" onSubmit={(event) => { event.preventDefault(); const value = queryDraft.trim(); setAcceptedSuggestion(value); setSubmittedQuery(value) }}>
                <InputFrame className="flex-1">
                  <Search aria-hidden="true" className="size-4 text-stone-500" />
                  <span className="sr-only">Search for a food</span>
                  <input className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-stone-400" onChange={(event) => { setQueryDraft(event.target.value); setAcceptedSuggestion(null); setSubmittedQuery('') }} placeholder="Search for a food" value={queryDraft} />
                </InputFrame>
                <Button disabled={!queryDraft.trim()} type="submit">Find</Button>
              </form>
            )}
            {!food && <div className="mt-3"><FoodSuggestionList
              items={autocomplete.items}
              onSelect={(suggestion) => {
                const name = suggestion.name ?? ''
                setQueryDraft(name)
                setAcceptedSuggestion(name)
                setSubmittedQuery(name)
              }}
            /></div>}
          </Card>

          <Button busy={prediction.isPending} className="w-full" disabled={!food || !session.endUserId} onClick={() => prediction.mutate()} type="button">
            Predict glucose response
          </Button>
        </div>

        <section aria-live="polite">
          {prediction.isError ? (
            <ErrorMessage error={prediction.error} />
          ) : prediction.data ? (
            <PredictionResult food={food!} quantity={quantity} result={prediction.data} servingId={servingId!} />
          ) : !food && submittedQuery ? (
            <div>
              <div className="mb-4">
                <SectionLabel>Choose a food</SectionLabel>
                <h2 className="mt-2 font-serif text-4xl">Results for “{submittedQuery}”</h2>
              </div>
              {hydratedFood.isError && <div className="mb-4"><ErrorMessage error={hydratedFood.error} /></div>}
              {foodSearch.isPending ? <SkeletonList /> : foodSearch.isError ? <ErrorMessage error={foodSearch.error} /> : foodSearch.data ? (
                <Card className="overflow-hidden">
                  {foodSearch.data.items.map((item) => (
                    <ResultRow
                      key={item.id}
                      busy={hydratedFood.isPending && hydratedFood.variables?.id === item.id}
                      disabled={hydratedFood.isPending}
                      media={<NetworkImage alt="" className="size-full" fallback={<Utensils aria-hidden="true" className="size-5 text-stone-600" />} src={item.photoUrl} />}
                      meta={`${formatNumber(item.calories, 0)} cal · ${item.servings[0] ? `${item.servings[0].quantity} ${item.servings[0].unit}` : 'No serving'}`}
                      onClick={() => chooseFood(item)}
                      title={item.name ?? 'Unnamed food'}
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

function PredictionResult({ food, servingId, quantity, result }: { food: FoodSearchItem; servingId: string; quantity: number; result: Awaited<ReturnType<typeof predictGlucose>> }) {
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
        <div className="data-number text-right text-sm font-bold text-stone-600">{formatNumber(quantity)} × {food.servings.find((item) => item.id === servingId)?.unit ?? 'serving'}</div>
      </Card>
      <p className="text-pretty text-sm leading-6 text-stone-500">This is an estimate for demonstration purposes, not medical advice.</p>
    </div>
  )
}
