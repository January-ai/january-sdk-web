import type { FoodSearchItem, LoggedFood } from '@januaryai/web-sdk'
import { formatNumber, formatQuantity } from './utils'

export function primaryServingLabel(food: FoodSearchItem) {
  const serving = food.servings.find((item) => item.isPrimary) ?? food.servings[0]
  return serving ? `${formatNumber(serving.quantity)} ${serving.unit}` : 'Serving unavailable'
}

/** A logged food's number of servings and the serving's size: "1 × 6 oz", not "1 oz". */
export function loggedServingLabel(food: LoggedFood) {
  const { quantity, unit } = food.servingDetails
  return `${formatQuantity(food.consumedServing.quantity)} × ${formatNumber(quantity)} ${unit ?? 'serving'}`
}
