import { appBrand } from './app-brand'

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-[var(--app-ink)] text-xl font-bold text-[var(--app-accent)]">{appBrand.monogram}</div><div><div className="font-serif text-xl leading-none">{appBrand.name}</div>{!compact && <div className="mt-1 text-xs font-bold uppercase text-stone-500">{appBrand.productLabel}</div>}</div></div>
}
