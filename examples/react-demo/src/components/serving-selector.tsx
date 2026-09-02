export interface ServingChoice {
  id: string | null
  quantity: number | null
  unit: string | null
}

export function ServingSelector({
  servings,
  value,
  onChange,
  label = 'Serving',
}: {
  servings: readonly ServingChoice[]
  value: string
  onChange(servingId: string): void
  label?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-stone-700">{label}</span>
      <select
        className="min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 outline-none transition-colors focus:bg-stone-50"
        onChange={(event) => onChange(event.currentTarget.value)}
        value={value}
      >
        {servings.filter((serving) => serving.id).map((serving) => (
          <option key={serving.id} value={serving.id!}>{serving.quantity ?? 1} {serving.unit ?? 'serving'}</option>
        ))}
      </select>
    </label>
  )
}
