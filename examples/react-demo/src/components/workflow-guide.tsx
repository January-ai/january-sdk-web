import { Card } from './ui/card'
import { SectionLabel } from './ui/section-label'

export interface WorkflowStep { title: string; description: string }

export function WorkflowGuide({ title, steps, className }: { title: string; steps: readonly WorkflowStep[]; className?: string }) {
  return <Card className={className ?? 'p-5 sm:p-6'}><SectionLabel>{title}</SectionLabel><ol className="mt-4 grid gap-4 sm:grid-cols-3">{steps.map((step, index) => <li className="flex gap-3" key={step.title}><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--app-control)] text-sm font-bold">{index + 1}</span><div><div className="font-bold">{step.title}</div><p className="mt-1 text-sm leading-5 text-stone-600">{step.description}</p></div></li>)}</ol></Card>
}
