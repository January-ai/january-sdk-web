export interface FeetAndInches {
  feet: number
  inches: number
}

export function heightInchesToFeetAndInches(heightInches: number): FeetAndInches {
  const roundedInches = Math.round(heightInches)
  return {
    feet: Math.floor(roundedInches / 12),
    inches: roundedInches % 12,
  }
}

export function inchesToCentimeters(heightInches: number): number {
  return heightInches * 2.54
}

export function centimetersToInches(centimeters: number): number {
  return centimeters / 2.54
}
