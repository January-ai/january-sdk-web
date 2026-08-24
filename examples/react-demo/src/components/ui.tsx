import { AlertCircle, ArrowRight, LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { cn } from '~/lib/utils'

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-7xl px-3 py-8 sm:px-4 lg:px-5 lg:py-12 xl:px-7', className)}>{children}</div>
}

export function PageHeader({ eyebrow, title, description, aside }: {
  eyebrow: string
  title: string
  description: string
  aside?: ReactNode
}) {
  return (
    <header className="grid gap-6 border-b border-stone-300 pb-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end lg:pb-10">
      <div>
        <p className="text-xs font-bold uppercase text-stone-500">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-balance font-serif text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-stone-600 sm:text-lg">{description}</p>
      </div>
      {aside}
    </header>
  )
}

export function Card({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-3xl border border-stone-300/80 bg-white shadow-sm', className)} {...props}>
      {children}
    </div>
  )
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn('text-xs font-bold uppercase text-stone-500', className)}>{children}</h2>
}

export function Button({ className, children, busy = false, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      className={cn(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 text-sm font-bold text-white shadow-sm hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500',
        className,
      )}
      {...props}
    >
      {busy && <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}
      {children}
    </button>
  )
}

export function SecondaryButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn('inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white px-5 text-sm font-bold text-stone-800 shadow-sm hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50', className)}
      {...props}
    >
      {children}
    </button>
  )
}

export function TextField({ label, className, inputClassName, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; inputClassName?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-2 block text-sm font-semibold text-stone-700">{label}</span>
      <input
        className={cn('min-h-12 w-full rounded-2xl border border-stone-300 bg-white px-4 text-base text-stone-950 outline-none placeholder:text-stone-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10', inputClassName)}
        {...props}
      />
    </label>
  )
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <Card className="grid min-h-72 place-items-center border-dashed bg-[#fbf9f4] p-8 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-[#eee8dc] text-stone-700">{icon}</div>
        <h3 className="mt-5 text-balance font-serif text-3xl">{title}</h3>
        <p className="mt-3 text-pretty leading-7 text-stone-600">{description}</p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </Card>
  )
}

export function ErrorMessage({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.'
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900" role="alert">
      <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div>
        <div className="font-bold">Request failed</div>
        <p className="mt-1 text-pretty text-sm leading-6">{message}</p>
      </div>
    </div>
  )
}

export function ResultRow({ media, title, meta, onClick }: { media: ReactNode; title: string; meta: string; onClick?: () => void }) {
  const content = (
    <>
      <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#eee8dc]">{media}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-bold text-stone-950">{title}</div>
        <div className="mt-1 truncate text-sm text-stone-500">{meta}</div>
      </div>
      {onClick && <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-stone-400" />}
    </>
  )
  return onClick ? (
    <button className="flex min-h-24 w-full items-center gap-4 border-b border-stone-200 px-5 py-4 text-left last:border-0 hover:bg-stone-50" onClick={onClick} type="button">
      {content}
    </button>
  ) : (
    <div className="flex min-h-24 items-center gap-4 border-b border-stone-200 px-5 py-4 last:border-0">{content}</div>
  )
}

export function SkeletonList() {
  return (
    <Card aria-label="Loading results" className="overflow-hidden">
      {[0, 1, 2, 3].map((item) => (
        <div className="flex min-h-24 items-center gap-4 border-b border-stone-200 px-5 py-4 last:border-0" key={item}>
          <div className="size-16 rounded-2xl bg-stone-200" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-2/5 rounded bg-stone-200" />
            <div className="h-3 w-3/5 rounded bg-stone-100" />
          </div>
        </div>
      ))}
    </Card>
  )
}
