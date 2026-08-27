import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '~/lib/utils'

export function Button({ className, children, busy = false, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button className={cn('inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 text-sm font-bold text-white shadow-sm hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500', className)} {...props}>
      {busy && <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}
      {children}
    </button>
  )
}

export function SecondaryButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn('inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white px-5 text-sm font-bold text-stone-800 shadow-sm hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50', className)} {...props}>{children}</button>
}
