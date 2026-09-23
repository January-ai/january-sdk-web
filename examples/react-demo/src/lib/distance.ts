const metersPerMile = 1_609.344

/**
 * A restaurant's distance, which the API gives in meters, as miles: one decimal under
 * 10 miles ("0.4 mi"), whole miles beyond ("12 mi").
 */
export function formatDistance(meters: number): string {
  const miles = meters / metersPerMile
  const digits = miles < 10 ? 1 : 0
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(miles)} mi`
}
