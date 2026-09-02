import type { FoodSearchItem, ServingOption } from '@januaryai/web-sdk'
import type { predictGlucose } from '~/api/january.functions'
import { cn, formatNumber } from '~/lib/utils'
import { GlucoseChart, friendlyImpact, impactClass } from './glucose-prediction'
import { Card, SectionLabel } from './ui'

export function FoodPredictionPanel({ food, quantity, serving, result }: { food: FoodSearchItem; quantity: number; serving: ServingOption; result: Awaited<ReturnType<typeof predictGlucose>> }) {
  const peak = result.prediction.reduce((best, point) => point.value > best.value ? point : best, result.prediction[0] ?? { minutes: 0, value: 0 })
  return <Card className="overflow-hidden"><div className="grid gap-5 border-b border-stone-200 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><div><SectionLabel>Likely peak</SectionLabel><div className="data-number mt-2 text-6xl font-bold text-[var(--app-warning)]">{formatNumber(peak.value, 0)}</div><p className="mt-2 text-sm font-semibold text-stone-500">mg/dL · about {formatNumber(peak.minutes, 0)} minutes after {formatNumber(quantity)} {serving.unit ?? 'serving'}</p></div><span className={cn('w-fit rounded-full px-4 py-2 text-sm font-bold', impactClass(result.impact))}>{friendlyImpact(result.impact)}</span></div><GlucoseChart result={result} /><div className="border-t border-stone-200 px-6 py-4 text-sm text-stone-500">Prediction for {food.name ?? 'the selected food'}. This estimate is for demonstration purposes, not medical advice.</div></Card>
}
