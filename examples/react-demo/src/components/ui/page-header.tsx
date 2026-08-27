import type { ReactNode } from 'react'

export function PageHeader({ eyebrow, title, description, aside }: { eyebrow: string; title: string; description: string; aside?: ReactNode }) {
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
