import { kilogramsToPounds, poundsToKilograms } from './weight-units.ts'

const millilitersPer = { fl_oz: 29.5735, ml: 1, cup: 8 * 29.5735 } as const

const round = (value: number, decimals: number) => Number(value.toFixed(decimals))

/** A typed water amount re-expressed in the newly picked unit, so switching units never changes the quantity. */
export function convertWaterDraft(value: number, from: keyof typeof millilitersPer, to: keyof typeof millilitersPer): number {
  if (from === to) return value
  const converted = (value * millilitersPer[from]) / millilitersPer[to]
  return to === 'ml' ? Math.round(converted) : round(converted, 1)
}

/** A typed weight re-expressed in the newly picked unit. */
export function convertWeightDraft(value: number, from: 'lb' | 'kg', to: 'lb' | 'kg'): number {
  if (from === to) return value
  return round(to === 'kg' ? poundsToKilograms(value) : kilogramsToPounds(value), 1)
}
