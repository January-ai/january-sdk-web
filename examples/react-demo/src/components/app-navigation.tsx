import { Link } from '@tanstack/react-router'
import { Camera, ClipboardList, Search, TrendingUp } from 'lucide-react'
import type { ComponentType } from 'react'

export const navigation = [
  { to: '/search', label: 'Search', description: 'Foods & restaurants', icon: Search, testId: 'tab-search' },
  { to: '/scan', label: 'Meal scan', description: 'Photo or description', icon: Camera, testId: 'tab-scan' },
  { to: '/food-logs', label: 'Food logs', description: 'Meal history', icon: ClipboardList, testId: 'tab-food-logs' },
  { to: '/glucose', label: 'Glucose', description: 'Predict a response', icon: TrendingUp, testId: 'tab-glucose' },
] as const

type NavigationItem = { to: '/search' | '/scan' | '/food-logs' | '/glucose'; label: string; description: string; icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; testId: string }

export function DesktopNavItem({ to, label, description, icon: Icon, testId }: NavigationItem) {
  return <Link activeProps={{ className: 'bg-stone-950 text-white shadow-md' }} className="group flex min-h-16 items-center gap-4 rounded-2xl px-4 py-3 text-stone-600 hover:bg-white/70 hover:text-stone-950" data-testid={testId} to={to}><Icon aria-hidden={true} className="size-5 shrink-0" /><span><span className="block font-semibold">{label}</span><span className="block text-xs text-current opacity-65">{description}</span></span></Link>
}

export function MobileNavItem({ to, label, icon: Icon, testId }: NavigationItem) {
  return <Link activeProps={{ className: 'bg-stone-950 text-white' }} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[0.68rem] font-bold text-stone-600" data-testid={testId} to={to}><Icon aria-hidden={true} className="size-5" />{label}</Link>
}
