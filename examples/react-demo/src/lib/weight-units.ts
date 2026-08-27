const kilogramsPerPound = 0.45359237

export function poundsToKilograms(pounds: number): number {
  return pounds * kilogramsPerPound
}

export function kilogramsToPounds(kilograms: number): number {
  return kilograms / kilogramsPerPound
}
