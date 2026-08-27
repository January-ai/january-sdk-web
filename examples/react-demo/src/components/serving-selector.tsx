export interface ServingChoice {
  id: number
  quantity: number
  unit: string
}

export function ServingSelector({
  servings,
  value,
  onChange,
  label = 'Serving',
}: {
  servings: readonly ServingChoice[]
  value: number
  onChange(servingId: number): void
  label?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-stone-700">{label}</span>
      <select
        className="min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 outline-none transition-colors focus:bg-stone-50"
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        value={value}
      >
        {servings.map((serving) => (
          <option key={serving.id} value={serving.id}>{serving.quantity} {serving.unit}</option>
        ))}
      </select>
    </label>
  )
}
