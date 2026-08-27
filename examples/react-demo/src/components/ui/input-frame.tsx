import type { LabelHTMLAttributes } from 'react'
import { cn } from '~/lib/utils'

export function InputFrame({ className, children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('flex min-h-12 min-w-0 cursor-text items-center gap-3 rounded-2xl border border-stone-300 bg-white px-4 transition-colors focus-within:bg-stone-50', className)} {...props}>{children}</label>
}
