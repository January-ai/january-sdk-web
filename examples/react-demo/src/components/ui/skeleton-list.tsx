import { Card } from './card'

export function SkeletonList() {
  return <Card aria-label="Loading results" className="overflow-hidden">{[0, 1, 2, 3].map((item) => <div className="flex min-h-24 items-center gap-4 border-b border-stone-200 px-5 py-4 last:border-0" key={item}><div className="size-16 rounded-2xl bg-stone-200" /><div className="flex-1 space-y-3"><div className="h-4 w-2/5 rounded bg-stone-200" /><div className="h-3 w-3/5 rounded bg-stone-100" /></div></div>)}</Card>
}
