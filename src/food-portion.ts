import type {
  FoodSearchItem,
  FoodSelection,
  NutrientAmount,
  NutritionFacts,
  ServingOption,
} from './models.js';

export type FoodPortionErrorCode =
  | 'no_servings'
  | 'serving_not_found'
  | 'invalid_serving'
  | 'invalid_quantity';

export interface FoodPortionOptions {
  servingId?: string;
  quantity?: number;
}

/** A validated serving and quantity with locally calculated nutrition. */
export class FoodPortion {
  readonly foodId: string;
  readonly serving: ServingOption;
  readonly quantity: number;
  readonly nutrition: NutritionFacts;
  readonly totalWeightGrams: number | null;
  readonly glycemicIndex: number | null;
  readonly glycemicLoad: number | null;
  readonly selection: FoodSelection;

  private constructor(food: FoodSearchItem, serving: ServingOption, quantity: number) {
    const servingQuantity = serving.quantity;
    const servingId = serving.id;
    if (servingQuantity == null || servingId == null) throw new FoodPortionError('invalid_serving');
    const scale = quantity * serving.scalingFactor / servingQuantity;
    this.foodId = food.id;
    this.serving = serving;
    this.quantity = quantity;
    this.nutrition = scaleNutrition(food.nutrients ?? legacyNutrition(food), scale);
    this.totalWeightGrams = serving.weightGrams == null
      ? null
      : serving.weightGrams * quantity / servingQuantity;
    this.glycemicIndex = food.glycemicIndex;
    this.glycemicLoad = food.glycemicLoad == null ? null : food.glycemicLoad * scale;
    this.selection = { id: food.id, serving: { id: servingId, quantity } };
  }

  static from(food: FoodSearchItem, options: FoodPortionOptions = {}): FoodPortion {
    if (food.servings.length === 0) throw new FoodPortionError('no_servings');
    const serving = options.servingId === undefined
      ? food.servings.find((item) => item.isPrimary) ?? food.servings[0]
      : food.servings.find((item) => item.id === options.servingId);
    if (!serving) throw new FoodPortionError('serving_not_found');
    if (serving.id == null || serving.quantity == null || !Number.isFinite(serving.quantity) || serving.quantity <= 0
      || !Number.isFinite(serving.scalingFactor) || serving.scalingFactor <= 0) {
      throw new FoodPortionError('invalid_serving');
    }
    const quantity = options.quantity ?? serving.quantity;
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 10_000) {
      throw new FoodPortionError('invalid_quantity');
    }
    return new FoodPortion(food, serving, quantity);
  }
}

export class FoodPortionError extends TypeError {
  constructor(readonly code: FoodPortionErrorCode) {
    super(`Invalid food portion: ${code}`);
    this.name = 'FoodPortionError';
  }
}

function scaled(amount: NutrientAmount | undefined, scale: number): NutrientAmount | undefined {
  return amount === undefined ? undefined : { value: amount.value * scale, unit: amount.unit };
}

function scaleNutrition(nutrition: NutritionFacts, scale: number): NutritionFacts {
  return {
    calories: scaled(nutrition.calories, scale),
    protein: scaled(nutrition.protein, scale),
    carbohydrates: scaled(nutrition.carbohydrates, scale),
    netCarbohydrates: scaled(nutrition.netCarbohydrates, scale),
    totalFat: scaled(nutrition.totalFat, scale),
    transFat: scaled(nutrition.transFat, scale),
    saturatedFat: scaled(nutrition.saturatedFat, scale),
    fiber: scaled(nutrition.fiber, scale),
    totalSugars: scaled(nutrition.totalSugars, scale),
    addedSugars: scaled(nutrition.addedSugars, scale),
    cholesterol: scaled(nutrition.cholesterol, scale),
    calcium: scaled(nutrition.calcium, scale),
    iron: scaled(nutrition.iron, scale),
    potassium: scaled(nutrition.potassium, scale),
    sodium: scaled(nutrition.sodium, scale),
    vitaminD: scaled(nutrition.vitaminD, scale),
  };
}

function legacyNutrition(food: FoodSearchItem): NutritionFacts {
  return {
    calories: amount(food.calories, 'cal'),
    protein: amount(food.protein, 'g'),
    carbohydrates: amount(food.carbohydrates, 'g'),
    netCarbohydrates: amount(food.netCarbohydrates, 'g'),
    totalFat: amount(food.totalFat, 'g'),
    saturatedFat: amount(food.saturatedFat, 'g'),
    fiber: amount(food.fiber, 'g'),
    totalSugars: amount(food.totalSugars, 'g'),
    addedSugars: amount(food.addedSugars, 'g'),
    cholesterol: amount(food.cholesterol, 'mg'),
    potassium: amount(food.potassium, 'mg'),
    sodium: amount(food.sodium, 'mg'),
  };
}

function amount(value: number | null, unit: string): NutrientAmount | undefined {
  return value == null ? undefined : { value, unit };
}
