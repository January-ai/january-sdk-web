import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number | null | undefined, maximumFractionDigits = 1) {
  if (value == null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value)
}

/** A serving quantity, which moves in quarters: 1.25 stays 1.25 rather than rounding to 1.3. */
export function formatQuantity(value: number | null | undefined) {
  return formatNumber(value, 2)
}
