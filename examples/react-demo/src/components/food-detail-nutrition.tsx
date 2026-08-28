import type { FoodPortion } from '@januaryai/sdk'
import { MacroGrid } from './macro-grid'
import { NutritionList } from './nutrition-list'
import { Card } from './ui'
import { formatNumber } from '~/lib/utils'

export function FoodMacroGrid({ portion }: { portion: FoodPortion | null }) {
  return <Card className="p-5 sm:p-6"><MacroGrid values={[
    { label: 'Calories', value: portion?.nutrition.calories?.value == null ? '—' : formatNumber(portion.nutrition.calories.value), unit: 'cal' },
    { label: 'Protein', value: portion?.nutrition.protein?.value == null ? '—' : formatNumber(portion.nutrition.protein.value), unit: 'g' },
    { label: 'Carbs', value: portion?.nutrition.carbohydrates?.value == null ? '—' : formatNumber(portion.nutrition.carbohydrates.value), unit: 'g' },
    { label: 'Fat', value: portion?.nutrition.totalFat?.value == null ? '—' : formatNumber(portion.nutrition.totalFat.value), unit: 'g' },
  ]} /></Card>
}

export function FoodNutritionFacts({ portion }: { portion: FoodPortion | null }) {
  const values = [
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
  ] as const
  const available = values.filter(([, value]) => value != null).map(([label, value, unit]) => ({ label, value: `${formatNumber(value ?? 0)}${unit ? ` ${unit}` : ''}` }))
  return <Card className="p-5 sm:p-6"><h2 className="font-serif text-3xl">Nutrition facts</h2>{available.length ? <div className="mt-4"><NutritionList values={available} /></div> : <p className="mt-4 text-stone-500">No additional nutrients were returned.</p>}</Card>
}
