import { ArrowRight, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'

export function ResultRow({ media, title, meta, onClick, busy = false, disabled = false }: { media: ReactNode; title: string; meta: string; onClick?: () => void; busy?: boolean; disabled?: boolean }) {
  const content = <><div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[var(--app-control)]">{media}</div><div className="min-w-0 flex-1"><div className="truncate text-base font-bold text-stone-950">{title}</div><div className="mt-1 truncate text-sm text-stone-500">{meta}</div></div>{busy ? <LoaderCircle aria-hidden="true" className="size-5 shrink-0 animate-spin text-stone-500" /> : onClick && <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-stone-400" />}</>
  return onClick ? <button className="flex min-h-24 w-full items-center gap-4 border-b border-stone-200 px-5 py-4 text-left last:border-0 hover:bg-stone-50 disabled:cursor-wait disabled:opacity-70" disabled={disabled || busy} onClick={onClick} type="button">{content}</button> : <div className="flex min-h-24 items-center gap-4 border-b border-stone-200 px-5 py-4 last:border-0">{content}</div>
}
