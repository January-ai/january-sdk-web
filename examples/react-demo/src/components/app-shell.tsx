import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  BookOpenText,
  Camera,
  ClipboardList,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { getDemoConfiguration } from '~/api/january.functions'
import { cn } from '~/lib/utils'

const navigation = [
  { to: '/search', label: 'Search', description: 'Foods & restaurants', icon: Search },
  { to: '/scan', label: 'Meal scan', description: 'Analyze a photo', icon: Camera },
  { to: '/food-logs', label: 'Food logs', description: 'Meal history', icon: ClipboardList },
  { to: '/glucose', label: 'Glucose', description: 'Predict a response', icon: TrendingUp },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const configuration = useQuery({
    queryKey: ['demo-configuration'],
    queryFn: () => getDemoConfiguration(),
    staleTime: Number.POSITIVE_INFINITY,
  })

  return (
    <div className="h-dvh overflow-hidden bg-stone-100 text-stone-950">
      <div className="mx-auto grid h-full max-w-[1600px] lg:grid-cols-[292px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 overflow-y-auto border-r border-stone-300/70 bg-[#eee8dc] px-3 py-6 lg:flex lg:flex-col xl:px-4 xl:py-8">
          <Brand />
          <nav aria-label="Primary navigation" className="mt-14 space-y-2">
            {navigation.map((item) => <DesktopNavItem key={item.to} {...item} />)}
          </nav>
          <div className="mt-auto space-y-5 pt-10">
            <div className="rounded-3xl border border-stone-300 bg-white/70 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-stone-500">
                <Sparkles aria-hidden="true" className="size-4" />
                Development workspace
              </div>
              <p className="mt-3 text-pretty text-sm leading-6 text-stone-600">
                Requests run through the local TypeScript SDK on the server.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm font-semibold">
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-2.5 rounded-full',
                    configuration.data?.configured ? 'bg-emerald-600' : 'bg-amber-600',
                  )}
                />
                {configuration.data?.configured ? 'API key configured' : 'API key required'}
              </div>
            </div>
            <a
              className="flex min-h-11 items-center gap-3 text-sm font-semibold text-stone-600 hover:text-stone-950"
              href="https://docs.january.ai/nutrition/apis/v1.2/"
              rel="noreferrer"
              target="_blank"
            >
              <BookOpenText aria-hidden="true" className="size-5" />
              Partner API documentation
            </a>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col">
          <header className="flex h-20 items-center justify-between border-b border-stone-300/70 bg-[#f8f5ed] px-5 lg:hidden">
            <Brand compact />
            <span className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-600">
              v1.2 · Dev
            </span>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto bg-[#f8f5ed] pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-0">
            {children}
          </main>
        </div>
      </div>

      <nav
        aria-label="Primary navigation"
        className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 grid grid-cols-4 rounded-3xl border border-stone-300 bg-[#fffdf8] p-1.5 shadow-lg lg:hidden"
      >
        {navigation.map((item) => <MobileNavItem key={item.to} {...item} />)}
      </nav>
    </div>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-11 place-items-center rounded-2xl bg-stone-950 text-xl font-bold text-[#f5c842]">J</div>
      <div>
        <div className="font-serif text-xl leading-none">January</div>
        {!compact && <div className="mt-1 text-xs font-bold uppercase text-stone-500">Partner API Lab</div>}
      </div>
    </div>
  )
}

function DesktopNavItem({
  to,
  label,
  description,
  icon: Icon,
}: {
  to: '/search' | '/scan' | '/food-logs' | '/glucose'
  label: string
  description: string
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
}) {
  return (
    <Link
      activeProps={{ className: 'bg-stone-950 text-white shadow-md' }}
      className="group flex min-h-16 items-center gap-4 rounded-2xl px-4 py-3 text-stone-600 hover:bg-white/70 hover:text-stone-950"
      to={to}
    >
      <Icon aria-hidden={true} className="size-5 shrink-0" />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-xs text-current opacity-65">{description}</span>
      </span>
    </Link>
  )
}

function MobileNavItem({
  to,
  label,
  icon: Icon,
}: {
  to: '/search' | '/scan' | '/food-logs' | '/glucose'
  label: string
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
}) {
  return (
    <Link
      activeProps={{ className: 'bg-stone-950 text-white' }}
      className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[0.68rem] font-bold text-stone-600"
      to={to}
    >
      <Icon aria-hidden={true} className="size-5" />
      {label}
    </Link>
  )
}
