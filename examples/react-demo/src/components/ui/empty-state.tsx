import type { ReactNode } from 'react'
import { Card } from './card'

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <Card className="grid min-h-72 place-items-center border-dashed bg-[var(--app-paper-muted)] p-8 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-[var(--app-control)] text-stone-700">{icon}</div>
        <h3 className="mt-5 text-balance font-serif text-3xl">{title}</h3>
        <p className="mt-3 text-pretty leading-7 text-stone-600">{description}</p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </Card>
  )
}
