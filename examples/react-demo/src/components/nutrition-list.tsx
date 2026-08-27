export interface NutritionValue { label: string; value: string }

export function NutritionList({ values }: { values: readonly NutritionValue[] }) {
  return <dl>{values.map((item) => <div className="flex min-h-11 items-center justify-between gap-4 border-b border-stone-200 py-2 last:border-0" key={item.label}><dt className="text-stone-600">{item.label}</dt><dd className="data-number font-semibold text-stone-950">{item.value}</dd></div>)}</dl>
}
