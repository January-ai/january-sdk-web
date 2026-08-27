import type { InputHTMLAttributes } from 'react'
import { cn } from '~/lib/utils'

export function TextField({ label, className, inputClassName, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; inputClassName?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-2 block text-sm font-semibold text-stone-700">{label}</span>
      <input className={cn('min-h-12 w-full rounded-2xl border border-stone-300 bg-white px-4 text-base text-stone-950 outline-none transition-colors placeholder:text-stone-400 focus:bg-stone-50', inputClassName)} {...props} />
    </label>
  )
}
