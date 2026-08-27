export interface MacroValue { label: string; value: string; unit: string }

export function MacroGrid({ values }: { values: readonly MacroValue[] }) {
  return <div className="grid grid-cols-2 gap-2">{values.slice(0, 4).map((item) => <div className="min-h-16 rounded-2xl bg-[var(--app-control)] p-3" key={item.label}><div className="data-number font-bold text-stone-950">{item.value} <span className="text-xs text-stone-500">{item.unit}</span></div><div className="mt-1 text-xs font-semibold text-stone-500">{item.label}</div></div>)}</div>
}
