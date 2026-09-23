import { Activity, PencilLine, Utensils } from 'lucide-react'
import { ActivityLevel, Sex } from '@januaryai/web-sdk'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { analyzeFoodPhoto, correctFoodScan, predictMealGlucose as requestMealGlucosePrediction } from '~/api/january.functions'
import { useUserSession } from '~/components/user-session'
import { cn, formatNumber, formatQuantity } from '~/lib/utils'
import { GlucoseChart, friendlyImpact, impactClass } from './glucose-prediction'
import { MacroGrid } from './macro-grid'
import { Button, Card, ErrorMessage, SecondaryButton, SectionLabel } from './ui'

type MealAnalysis = Awaited<ReturnType<typeof analyzeFoodPhoto>>
type MealPrediction = Awaited<ReturnType<typeof requestMealGlucosePrediction>>
type MealFood = NonNullable<MealAnalysis['detections']>[number]['food']

export function ScanResult({ result, onAnalyzeAnother, testId }: { result: MealAnalysis; onAnalyzeAnother(): void; testId?: string }) {
  const session = useUserSession()
  // A correction replaces the analysis shown here; the next correction starts from it.
  const [analysis, setAnalysis] = useState(result)
  const [source, setSource] = useState(result)
  const [correcting, setCorrecting] = useState(false)
  const [instruction, setInstruction] = useState('')
  if (source !== result) {
    // A new analysis from the parent starts over.
    setSource(result)
    setAnalysis(result)
  }
  const nutrients = analysis.totalNutrients
  // A detection the API could not size is left out of the prediction rather
  // than being counted as one serving.
  const foods = (analysis.detections ?? []).flatMap((detection) => {
    const servingId = detection.food.serving.id
    const quantity = detection.food.quantity
    if (!detection.food.id || !servingId || quantity == null) return []
    return [{
      foodId: detection.food.id,
      servingId,
      quantity,
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
  const correction = useMutation({
    mutationFn: () => correctFoodScan({ data: {
      analysis,
      instruction: instruction.trim(),
      ...(session.endUserId ? { endUserId: session.endUserId } : {}),
    } }),
    onSuccess: (corrected) => {
      setAnalysis(corrected)
      setCorrecting(false)
      setInstruction('')
      prediction.reset()
    },
  })

  return (
    <div className="space-y-5" data-testid={testId}>
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>Meal</SectionLabel>
          {analysis !== result && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-950" data-testid="scan-corrected">Corrected</span>}
        </div>
        <h3 className="mt-3 text-balance font-serif text-4xl">{analysis.mealName ?? 'Detected meal'}</h3>
        {nutrients && <div className="mt-6"><MacroGrid values={[
          { label: 'Calories', value: formatNumber(nutrients.calories?.value), unit: 'cal' },
          { label: 'Protein', value: formatNumber(nutrients.protein?.value), unit: 'g' },
          { label: 'Carbs', value: formatNumber(nutrients.carbohydrates?.value), unit: 'g' },
          { label: 'Fat', value: formatNumber(nutrients.totalFat?.value), unit: 'g' },
        ]} /></div>}
      </Card>

      <Card className="overflow-hidden">
        {(analysis.detections ?? []).map((detection, index) => (
          <div className="flex items-center gap-4 border-b border-stone-200 p-5 last:border-0" data-testid={`scan-detection-${index}`} key={`${detection.food.id ?? 'detected'}-${index}`}>
            <div className="grid size-12 place-items-center rounded-xl bg-[var(--app-control)]"><Utensils aria-hidden="true" className="size-5 text-stone-600" /></div>
            <div className="min-w-0 flex-1">
              <div className="font-bold">{detection.food.name}</div>
              <div className="mt-1 text-sm text-stone-500">{servingLabel(detection.food)}{detection.confidenceScore ? ` · ${confidenceLabel(detection.confidenceScore)}` : ''}</div>
            </div>
          </div>
        ))}
        {!analysis.detections?.length && <p className="p-5 text-pretty text-sm text-stone-600" data-testid="scan-detections-empty">January did not recognize a food. Try a clearer photo or a more specific description, or correct the result below.</p>}
      </Card>

      {correcting ? (
        <Card className="p-5 sm:p-6" data-testid="scan-correction">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-stone-700">What should change?</span>
            <textarea
              className="min-h-24 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-950 outline-none transition-colors placeholder:text-stone-400 focus:bg-stone-50"
              data-testid="scan-correction-input"
              disabled={correction.isPending}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder="For example: it was two eggs, not three, and there was no toast."
              value={instruction}
            />
          </label>
          <p className="mt-2 text-pretty text-sm text-stone-500">January updates the foods, quantities, and nutrition from the current result and your note.</p>
          {correction.isError && <div className="mt-4"><ErrorMessage error={correction.error} onRetry={() => correction.mutate()} retryTestId="scan-correction-retry" testId="scan-correction-error" /></div>}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Button busy={correction.isPending} busyTestId="scan-correction-loading" data-testid="scan-correction-submit" disabled={!instruction.trim() || correction.isPending} onClick={() => correction.mutate()} type="button">
              {correction.isPending ? 'Submitting correction…' : 'Submit correction'}
            </Button>
            <SecondaryButton data-testid="scan-correction-cancel" disabled={correction.isPending} onClick={() => { setCorrecting(false); correction.reset() }} type="button">Cancel</SecondaryButton>
          </div>
        </Card>
      ) : (
        <SecondaryButton className="w-full" data-testid="scan-correct" onClick={() => setCorrecting(true)} type="button">
          <PencilLine aria-hidden="true" className="size-5" />
          Correct result
        </SecondaryButton>
      )}

      <Button
        busy={prediction.isPending}
        busyTestId="scan-glucose-loading"
        className="w-full"
        data-testid="scan-glucose-predict"
        disabled={foods.length === 0 || prediction.isPending}
        onClick={() => prediction.mutate()}
        title={foods.length === 0 ? 'No detected food has a catalog serving available for prediction.' : undefined}
        type="button"
      >
        <Activity aria-hidden="true" className="size-5" />
        {prediction.isPending ? 'Predicting response…' : prediction.data ? 'Refresh glucose prediction' : 'Show glucose prediction'}
      </Button>
      {prediction.isError && <ErrorMessage error={prediction.error} testId="scan-glucose-error" />}
      {prediction.data && <MealPredictionPanel result={prediction.data} />}

      <Button className="w-full" data-testid="scan-another" onClick={onAnalyzeAnother} type="button">Analyze another meal</Button>
    </div>
  )
}

function MealPredictionPanel({ result }: { result: MealPrediction }) {
  const peak = result.prediction.reduce((best, point) => point.value > best.value ? point : best, result.prediction[0] ?? { minutes: 0, value: 0 })
  return (
    <Card className="overflow-hidden" data-testid="scan-glucose-result">
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

function servingLabel(food: MealFood) {
  const { serving, quantity } = food
  if (!serving.unit) return 'Serving estimated'
  const size = [serving.quantity, serving.unit].filter((value) => value !== null && value !== undefined).join(' ')
  return quantity == null ? size : `${formatQuantity(quantity)} × ${size}`
}

function confidenceLabel(value: string) {
  const readable = value.replaceAll('_', ' ').trim().toLocaleLowerCase()
  return `${readable.charAt(0).toLocaleUpperCase()}${readable.slice(1)} confidence`
}
