import type { ReactNode } from 'react'
import { cn } from '~/lib/utils'

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-7xl px-3 py-8 sm:px-4 lg:px-5 lg:py-12 xl:px-7', className)}>{children}</div>
}
