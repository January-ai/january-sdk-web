import { Activity, Utensils } from 'lucide-react'
import { ActivityLevel, Sex } from '@januaryai/web-sdk'
import { useMutation } from '@tanstack/react-query'
import { analyzeFoodPhoto, predictMealGlucose as requestMealGlucosePrediction } from '~/api/january.functions'
import { useUserSession } from '~/components/user-session'
import { cn, formatNumber } from '~/lib/utils'
import { GlucoseChart, friendlyImpact, impactClass } from './glucose-prediction'
import { MacroGrid } from './macro-grid'
import { Button, Card, ErrorMessage, SectionLabel } from './ui'

type MealAnalysis = Awaited<ReturnType<typeof analyzeFoodPhoto>>
type MealPrediction = Awaited<ReturnType<typeof requestMealGlucosePrediction>>
type MealServing = NonNullable<NonNullable<MealAnalysis['detections']>[number]['food']['servings']>[number]

export function ScanResult({ result, onAnalyzeAnother }: { result: MealAnalysis; onAnalyzeAnother(): void }) {
  const session = useUserSession()
  const nutrients = result.totalNutrients
  const foods = (result.detections ?? []).flatMap((detection) => {
    const serving = detection.food.servings?.find((candidate) => candidate.id)
    if (!detection.food.id || !serving?.id) return []
    return [{
      foodId: detection.food.id,
      servingId: serving.id,
      quantity: serving.selectedQuantity ?? serving.quantity ?? 1,
    }]
  })
  const prediction = useMutation({
    mutationFn: () => requestMealGlucosePrediction({ data: {
      age: 42,
      sex: Sex.female,
      height: 66,
      weight: 150,
      activityLevel: ActivityLevel.moderatelyActive,
      healthConditions: [],
      foods,
      startTime: new Date().toISOString(),
      endUserTimezone: session.endUserTimezone,
      ...(session.endUserId ? { endUserId: session.endUserId } : {}),
    } }),
  })

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <SectionLabel>Meal</SectionLabel>
        <h3 className="mt-3 text-balance font-serif text-4xl">{result.mealName ?? 'Detected meal'}</h3>
        {nutrients && <div className="mt-6"><MacroGrid values={[
          { label: 'Calories', value: formatNumber(nutrients.calories?.value), unit: 'cal' },
          { label: 'Protein', value: formatNumber(nutrients.protein?.value), unit: 'g' },
          { label: 'Carbs', value: formatNumber(nutrients.carbohydrates?.value), unit: 'g' },
          { label: 'Fat', value: formatNumber(nutrients.totalFat?.value), unit: 'g' },
        ]} /></div>}
      </Card>

      <Card className="overflow-hidden">
        {(result.detections ?? []).map((detection, index) => (
          <div className="flex items-center gap-4 border-b border-stone-200 p-5 last:border-0" key={`${detection.food.id ?? 'detected'}-${index}`}>
            <div className="grid size-12 place-items-center rounded-xl bg-[var(--app-control)]"><Utensils aria-hidden="true" className="size-5 text-stone-600" /></div>
            <div className="min-w-0 flex-1">
              <div className="font-bold">{detection.food.name}</div>
              <div className="mt-1 text-sm text-stone-500">{servingLabel(detection.food.servings?.[0])}{detection.confidenceScore ? ` · ${confidenceLabel(detection.confidenceScore)}` : ''}</div>
            </div>
          </div>
        ))}
      </Card>

      <Button
        busy={prediction.isPending}
        className="w-full"
        disabled={foods.length === 0 || prediction.isPending}
        onClick={() => prediction.mutate()}
        title={foods.length === 0 ? 'No detected food has a catalog serving available for prediction.' : undefined}
        type="button"
      >
        <Activity aria-hidden="true" className="size-5" />
        {prediction.isPending ? 'Predicting response…' : prediction.data ? 'Refresh glucose prediction' : 'Show glucose prediction'}
      </Button>
      {prediction.isError && <ErrorMessage error={prediction.error} />}
      {prediction.data && <MealPredictionPanel result={prediction.data} />}

      <Button className="w-full" onClick={onAnalyzeAnother} type="button">Analyze another meal</Button>
    </div>
  )
}

function MealPredictionPanel({ result }: { result: MealPrediction }) {
  const peak = result.prediction.reduce((best, point) => point.value > best.value ? point : best, result.prediction[0] ?? { minutes: 0, value: 0 })
  return (
    <Card className="overflow-hidden">
      <div className="grid gap-5 border-b border-stone-200 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <SectionLabel>Likely meal peak</SectionLabel>
          <div className="data-number mt-2 text-6xl font-bold text-[var(--app-warning)]">{formatNumber(peak.value, 0)}</div>
          <p className="mt-2 text-sm font-semibold text-stone-500">mg/dL · about {formatNumber(peak.minutes, 0)} minutes after the meal</p>
        </div>
        <span className={cn('w-fit rounded-full px-4 py-2 text-sm font-bold', impactClass(result.impact))}>{friendlyImpact(result.impact)}</span>
      </div>
      <GlucoseChart result={result} />
      <div className="border-t border-stone-200 px-6 py-4 text-sm text-stone-500">Prediction for all detected foods. This estimate is for demonstration purposes, not medical advice.</div>
    </Card>
  )
}

function servingLabel(serving: MealServing | undefined) {
  if (!serving) return 'Serving estimated'
  const quantity = serving.selectedQuantity ?? serving.quantity
  return [quantity, serving.unit].filter((value) => value !== null && value !== undefined).join(' ') || 'Serving estimated'
}

function confidenceLabel(value: string) {
  const readable = value.replaceAll('_', ' ').trim().toLocaleLowerCase()
  return `${readable.charAt(0).toLocaleUpperCase()}${readable.slice(1)} confidence`
}
