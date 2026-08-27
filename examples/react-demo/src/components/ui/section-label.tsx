import type { ReactNode } from 'react'
import { cn } from '~/lib/utils'

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn('text-xs font-bold uppercase text-stone-500', className)}>{children}</h2>
}
