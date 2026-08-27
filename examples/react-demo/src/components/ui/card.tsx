import type { HTMLAttributes } from 'react'
import { cn } from '~/lib/utils'

export function Card({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-3xl border border-stone-300/80 bg-white shadow-sm', className)} {...props}>{children}</div>
}
