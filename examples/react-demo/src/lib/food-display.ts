import type { FoodSearchItem } from '@januaryai/sdk'
import { formatNumber } from './utils'

export function primaryServingLabel(food: FoodSearchItem) {
  const serving = food.servings.find((item) => item.isPrimary) ?? food.servings[0]
  return serving ? `${formatNumber(serving.quantity)} ${serving.unit}` : 'Serving unavailable'
}
