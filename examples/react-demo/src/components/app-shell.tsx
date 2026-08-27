import { useQuery } from '@tanstack/react-query'
import {
  BookOpenText,
  Sparkles,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { getDemoConfiguration } from '~/api/january.functions'
import { cn } from '~/lib/utils'
import { appBrand } from './app-brand'
import { DesktopNavItem, MobileNavItem, navigation } from './app-navigation'
import { BrandMark } from './brand-mark'
import { UserSessionProvider } from './user-session'

export function AppShell({ children }: { children: ReactNode }) {
  const configuration = useQuery({
    queryKey: ['demo-configuration'],
    queryFn: () => getDemoConfiguration(),
    staleTime: Number.POSITIVE_INFINITY,
  })

  return (
    <UserSessionProvider defaultEndUserId={configuration.data?.defaultEndUserId}>
    <div className="h-dvh overflow-hidden bg-[var(--app-canvas)] text-[var(--app-ink)]">
      <div className="mx-auto grid h-full max-w-[1600px] lg:grid-cols-[292px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 overflow-y-auto border-r border-stone-300/70 bg-[var(--app-control)] px-3 py-6 lg:flex lg:flex-col xl:px-4 xl:py-8">
          <BrandMark />
          <nav aria-label="Primary navigation" className="mt-14 space-y-2">
            {navigation.map((item) => <DesktopNavItem key={item.to} {...item} />)}
          </nav>
          <div className="mt-auto space-y-5 pt-10">
            <div className="rounded-3xl border border-stone-300 bg-white/70 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-stone-500">
                <Sparkles aria-hidden="true" className="size-4" />
                {appBrand.environmentLabel}
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
              href={appBrand.documentationUrl}
              rel="noreferrer"
              target="_blank"
            >
              <BookOpenText aria-hidden="true" className="size-5" />
              Partner API documentation
            </a>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col">
          <header className="flex h-20 items-center justify-between border-b border-stone-300/70 bg-[var(--app-paper)] px-5 lg:hidden">
            <BrandMark compact />
            <span className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-600">
              {appBrand.apiVersion} · Dev
            </span>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto bg-[var(--app-paper)] pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-0">
            {children}
          </main>
        </div>
      </div>

      <nav
        aria-label="Primary navigation"
        className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 grid grid-cols-4 rounded-3xl border border-stone-300 bg-[var(--app-surface)] p-1.5 shadow-lg lg:hidden"
      >
        {navigation.map((item) => <MobileNavItem key={item.to} {...item} />)}
      </nav>
    </div>
    </UserSessionProvider>
  )
}
