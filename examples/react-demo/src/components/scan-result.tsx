import { Utensils } from 'lucide-react'
import type { scanMeal } from '~/api/january.functions'
import { formatNumber } from '~/lib/utils'
import { MacroGrid } from './macro-grid'
import { Button, Card, SectionLabel } from './ui'

export function ScanResult({ result, onAnalyzeAnother }: { result: Awaited<ReturnType<typeof scanMeal>>; onAnalyzeAnother(): void }) {
  const nutrients = result.totalNutrients
  return <div className="space-y-5"><Card className="p-6"><SectionLabel>Meal</SectionLabel><h3 className="mt-3 text-balance font-serif text-4xl">{result.mealName ?? 'Detected meal'}</h3>{nutrients && <div className="mt-6"><MacroGrid values={[
    { label: 'Calories', value: formatNumber(nutrients.calories?.value), unit: 'cal' },
    { label: 'Protein', value: formatNumber(nutrients.protein?.value), unit: 'g' },
    { label: 'Carbs', value: formatNumber(nutrients.carbohydrates?.value), unit: 'g' },
    { label: 'Fat', value: formatNumber(nutrients.totalFat?.value), unit: 'g' },
  ]} /></div>}</Card><Card className="overflow-hidden">{(result.detections ?? []).map((detection, index) => <div className="flex items-center gap-4 border-b border-stone-200 p-5 last:border-0" key={`${detection.food.id ?? 'detected'}-${index}`}><div className="grid size-12 place-items-center rounded-xl bg-[var(--app-control)]"><Utensils aria-hidden="true" className="size-5 text-stone-600" /></div><div className="min-w-0 flex-1"><div className="font-bold">{detection.food.name}</div><div className="mt-1 text-sm text-stone-500">{detection.food.servings?.[0]?.unit ?? 'Serving estimated'}{detection.confidenceScore ? ` · ${confidenceLabel(detection.confidenceScore)}` : ''}</div></div></div>)}</Card><Button className="w-full" onClick={onAnalyzeAnother} type="button">Analyze another photo</Button></div>
}

function confidenceLabel(value: string) {
  const readable = value.replaceAll('_', ' ').trim().toLocaleLowerCase()
  return `${readable.charAt(0).toLocaleUpperCase()}${readable.slice(1)} confidence`
}
