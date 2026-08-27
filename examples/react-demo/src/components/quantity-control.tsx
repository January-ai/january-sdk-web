import { Minus, Plus } from 'lucide-react'
import type { ReactNode } from 'react'

export function QuantityControl({ value, onDecrease, onIncrease, decreaseDisabled = false }: { value: ReactNode; onDecrease(): void; onIncrease(): void; decreaseDisabled?: boolean }) {
  return <div className="flex shrink-0 items-center rounded-full border border-stone-300 bg-[var(--app-paper)] p-1"><button aria-label="Decrease quantity" className="grid size-10 place-items-center rounded-full hover:bg-white disabled:opacity-40" disabled={decreaseDisabled} onClick={onDecrease} type="button"><Minus aria-hidden="true" className="size-4" /></button><span className="data-number min-w-12 text-center font-bold">{value}</span><button aria-label="Increase quantity" className="grid size-10 place-items-center rounded-full bg-[var(--app-ink)] text-white hover:opacity-85" onClick={onIncrease} type="button"><Plus aria-hidden="true" className="size-4" /></button></div>
}
