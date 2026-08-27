import { cn } from '~/lib/utils'

export interface SegmentedOption<T extends string> { value: T; label: string }

export function SegmentedControl<T extends string>({ label, name, options, value, onChange, className, variant = 'filled' }: {
  label: string
  name: string
  options: readonly SegmentedOption<T>[]
  value: T
  onChange(value: T): void
  className?: string
  variant?: 'filled' | 'outlined'
}) {
  return (
    <fieldset className={className}>
      <legend className={variant === 'filled' ? 'sr-only' : 'text-sm font-semibold text-stone-700'}>{label}</legend>
      <div className={cn('grid gap-2', variant === 'filled' && 'rounded-2xl bg-[var(--app-control)] p-1.5')} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => (
          <label className={cn(
            'flex min-h-11 min-w-0 cursor-pointer items-center justify-center px-2 text-center text-xs font-bold focus-within:ring-2 focus-within:ring-stone-900/25 sm:text-sm',
            variant === 'filled' ? 'rounded-xl' : 'rounded-xl border',
            value === option.value
              ? variant === 'filled' ? 'bg-white text-stone-950 shadow-sm' : 'border-stone-950 bg-stone-950 text-white'
              : variant === 'filled' ? 'text-stone-600' : 'border-stone-300 bg-white text-stone-600',
          )} key={option.value}>
            <input className="sr-only" checked={value === option.value} name={name} onChange={() => onChange(option.value)} type="radio" value={option.value} />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
