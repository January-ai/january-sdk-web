import { cn } from '~/lib/utils'
import type { SegmentedOption } from './segmented-control'

export function ChipSelector<T extends string>({ label, name, options, value, onChange, className }: {
  label: string
  name: string
  options: readonly SegmentedOption<T>[]
  value: T
  onChange(value: T): void
  className?: string
}) {
  return (
    <fieldset className={className}>
      <legend className="text-sm font-semibold text-stone-700">{label}</legend>
      <div className="mt-2 grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => <label className={cn('flex min-h-10 min-w-0 cursor-pointer items-center justify-center rounded-full border px-1 text-center text-xs font-bold focus-within:ring-2 focus-within:ring-stone-900/25 sm:min-h-11 sm:px-2 sm:text-sm', value === option.value ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-300 bg-white text-stone-600')} key={option.value}><input className="sr-only" checked={value === option.value} name={name} onChange={() => onChange(option.value)} type="radio" value={option.value} />{option.label}</label>)}
      </div>
    </fieldset>
  )
}
