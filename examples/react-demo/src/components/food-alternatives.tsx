import { DietPreference, DietRestriction, type FoodSearchItem } from '@januaryai/web-sdk'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, Leaf } from 'lucide-react'
import { useState } from 'react'
import { suggestFoodAlternatives } from '~/api/january.functions'
import { cn, formatNumber } from '~/lib/utils'
import { Button, Card, ErrorMessage, SectionLabel } from './ui'

const restrictionOptions = [
  { value: DietRestriction.gluten, label: 'Gluten' },
  { value: DietRestriction.lactose, label: 'Lactose' },
  { value: DietRestriction.yeast, label: 'Yeast' },
  { value: DietRestriction.treeNuts, label: 'Tree nuts' },
  { value: DietRestriction.peanuts, label: 'Peanuts' },
  { value: DietRestriction.dairy, label: 'Dairy' },
  { value: DietRestriction.eggs, label: 'Eggs' },
  { value: DietRestriction.sulfites, label: 'Sulfites' },
  { value: DietRestriction.soy, label: 'Soy' },
  { value: DietRestriction.wheat, label: 'Wheat' },
  { value: DietRestriction.shellfish, label: 'Shellfish' },
  { value: DietRestriction.fish, label: 'Fish' },
  { value: DietRestriction.mushrooms, label: 'Mushrooms' },
  { value: DietRestriction.sesame, label: 'Sesame' },
  { value: DietRestriction.monosodiumGlutamate, label: 'MSG' },
  { value: DietRestriction.caffeine, label: 'Caffeine' },
  { value: DietRestriction.fodmaps, label: 'FODMAPs' },
] as const

const preferenceOptions = [
  { value: DietPreference.vegetarian, label: 'Vegetarian' },
  { value: DietPreference.vegan, label: 'Vegan' },
  { value: DietPreference.keto, label: 'Keto' },
  { value: DietPreference.paleo, label: 'Paleo' },
  { value: DietPreference.pescatarian, label: 'Pescatarian' },
  { value: DietPreference.lowCarbohydrate, label: 'Low carb' },
  { value: DietPreference.highProtein, label: 'High protein' },
  { value: DietPreference.kosher, label: 'Kosher' },
  { value: DietPreference.halal, label: 'Halal' },
] as const

const chipClass = (selected: boolean) => cn(
  'min-h-10 rounded-full border px-3 text-xs font-bold sm:text-sm',
  selected ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-300 bg-white text-stone-600 hover:text-stone-900',
)

function toggle<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

/**
 * Asks January for foods to eat instead of this one, shaped by the dietary restrictions and
 * preferences chosen here. Each suggestion opens as its own food.
 */
export function FoodAlternatives({ food, endUserId }: { food: FoodSearchItem; endUserId?: string }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [restrictions, setRestrictions] = useState<DietRestriction[]>([])
  const [preferences, setPreferences] = useState<DietPreference[]>([])
  const alternatives = useMutation({
    mutationFn: () => suggestFoodAlternatives({ data: {
      foodId: food.id,
      dietRestrictions: restrictions,
      dietPreferences: preferences,
      ...(endUserId ? { endUserId } : {}),
    } }),
  })

  if (!open) {
    return (
      <Button className="w-full border border-stone-300 bg-white text-stone-900 hover:bg-stone-50" data-testid="food-alternatives" onClick={() => setOpen(true)} type="button">
        <Leaf aria-hidden="true" className="size-5" /> Find food alternatives
      </Button>
    )
  }

  const results = alternatives.data?.alternatives
  return (
    <Card className="overflow-hidden" data-testid="alternatives-panel">
      <div className="border-b border-stone-200 p-5 sm:p-6">
        <SectionLabel>Food alternatives</SectionLabel>
        <h2 className="mt-2 text-balance font-serif text-3xl">Instead of {food.name ?? 'this food'}</h2>
        <p className="mt-2 text-pretty text-sm leading-6 text-stone-600">Choose any dietary needs that should shape January’s suggestions, then ask for alternatives.</p>
        <fieldset className="mt-5">
          <legend className="text-xs font-bold uppercase text-stone-500">Dietary restrictions</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {restrictionOptions.map((option) => <button aria-pressed={restrictions.includes(option.value)} className={chipClass(restrictions.includes(option.value))} data-testid={`diet-restriction-${option.value}`} key={option.value} onClick={() => setRestrictions((values) => toggle(values, option.value))} type="button">{option.label}</button>)}
          </div>
        </fieldset>
        <fieldset className="mt-5">
          <legend className="text-xs font-bold uppercase text-stone-500">Dietary preferences</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {preferenceOptions.map((option) => <button aria-pressed={preferences.includes(option.value)} className={chipClass(preferences.includes(option.value))} data-testid={`diet-preference-${option.value}`} key={option.value} onClick={() => setPreferences((values) => toggle(values, option.value))} type="button">{option.label}</button>)}
          </div>
        </fieldset>
        <Button busy={alternatives.isPending} busyTestId="alternatives-loading" className="mt-6 w-full" data-testid="alternatives-refresh" disabled={alternatives.isPending} onClick={() => alternatives.mutate()} type="button">
          <Leaf aria-hidden="true" className="size-5" /> {alternatives.isPending ? 'Finding alternatives…' : results ? 'Refresh alternatives' : 'Find alternatives'}
        </Button>
      </div>
      <div aria-live="polite">
        {alternatives.isError ? (
          <div className="p-5 sm:p-6"><ErrorMessage error={alternatives.error} onRetry={() => alternatives.mutate()} retryTestId="alternatives-error-retry" testId="alternatives-error" /></div>
        ) : results?.length === 0 ? (
          <p className="p-5 text-pretty text-sm text-stone-600 sm:p-6" data-testid="alternatives-empty">No foods matched every selected dietary need. Remove one and try again.</p>
        ) : results ? (
          <div data-testid="alternatives-results">
            <p className="px-5 pt-4 text-xs font-bold uppercase text-stone-500 sm:px-6">Suggestions · {results.length}</p>
            {results.map((alternative, index) => (
              <button
                className="flex min-h-20 w-full items-center gap-4 border-b border-stone-200 px-5 py-4 text-left last:border-0 hover:bg-stone-50 disabled:cursor-default sm:px-6"
                data-testid={`alternative-${index}`}
                disabled={!alternative.id}
                key={alternative.id ?? `${alternative.name}-${index}`}
                onClick={() => alternative.id && void navigate({ to: '/food/$foodId', params: { foodId: alternative.id }, search: { q: alternative.name ?? '' } })}
                type="button"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{alternative.name ?? 'Unnamed food'}</div>
                  {alternative.brandName && <div className="truncate text-sm text-stone-500">{alternative.brandName}</div>}
                  <div className="data-number mt-1 text-sm text-stone-500">
                    {formatNumber(alternative.nutrients.calories?.value, 0)} cal · P {formatNumber(alternative.nutrients.protein?.value)} g · C {formatNumber(alternative.nutrients.carbohydrates?.value)} g · F {formatNumber(alternative.nutrients.totalFat?.value)} g
                    {alternative.servings[0] ? ` · ${formatNumber(alternative.servings[0].quantity)} ${alternative.servings[0].unit ?? 'serving'}` : ''}
                  </div>
                </div>
                {alternative.id && <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-stone-400" />}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  )
}
