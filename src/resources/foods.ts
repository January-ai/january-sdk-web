import type {
  FoodSearchResults,
  LookupFoodByBarcodeRequest,
  SearchFoodsByNaturalLanguageRequest,
  SearchFoodsByNaturalLanguageResponse,
  SearchFoodsRequest,
  SuggestFoodAlternativesRequest,
  SuggestFoodAlternativesResponse,
} from '../models.js';
import { executeRequest } from '../errors.js';
import { FoodsApi } from '../internal/transport/apis/FoodsApi.js';

export class FoodsResource {
  constructor(private readonly api: FoodsApi) {}

  async search(request: SearchFoodsRequest): Promise<FoodSearchResults> {
    const query = request.query.trim();
    if (query.length === 0 || query.length > 256) {
      throw new TypeError('Food search query must contain between 1 and 256 characters.');
    }
    const limit = request.limit ?? 10;
    if (!Number.isInteger(limit) || limit < 1 || limit > 40) {
      throw new TypeError('Food search limit must be an integer between 1 and 40.');
    }

    const response = await executeRequest(() => this.api.searchFoods({
      query,
      ...(request.endUserId !== undefined ? { xEndUserId: request.endUserId } : {}),
      ...(request.category !== undefined ? { category: request.category } : {}),
      limit,
    }, request.signal ? { signal: request.signal } : undefined));

    return mapFoodSearchResults(response);
  }

  async lookupBarcode(request: LookupFoodByBarcodeRequest): Promise<FoodSearchResults> {
    const upc = request.upc.trim();
    if (upc.length === 0) throw new TypeError('A barcode is required.');
    const response = await executeRequest(() => this.api.lookupFoodByBarcode({
      upc,
      ...(request.endUserId !== undefined ? { xEndUserId: request.endUserId } : {}),
    }, request.signal ? { signal: request.signal } : undefined));
    return mapFoodSearchResults(response);
  }

  async searchNaturalLanguage(
    request: SearchFoodsByNaturalLanguageRequest,
  ): Promise<SearchFoodsByNaturalLanguageResponse> {
    const query = request.query.trim();
    if (query.length === 0) throw new TypeError('A meal description is required.');
    return executeRequest(() => this.api.searchFoodsByNaturalLanguage({
      query,
      ...(request.endUserId !== undefined ? { xEndUserId: request.endUserId } : {}),
    }, request.signal ? { signal: request.signal } : undefined));
  }

  async suggestAlternatives(
    request: SuggestFoodAlternativesRequest,
  ): Promise<SuggestFoodAlternativesResponse> {
    return executeRequest(() => this.api.suggestFoodAlternatives({
      foodId: request.foodId,
      suggestFoodAlternativesBody: {
        dietRestrictions: request.dietRestrictions,
        dietPreferences: request.dietPreferences,
      },
      ...(request.endUserId !== undefined ? { xEndUserId: request.endUserId } : {}),
    }, request.signal ? { signal: request.signal } : undefined));
  }
}

function mapFoodSearchResults(response: import('../internal/transport/models/FoodSearchResults.js').FoodSearchResults): FoodSearchResults {
  return {
    totalCount: response.totalCount,
    items: response.items.map((item) => ({
      id: item.id,
      name: item.name,
      brandName: item.brandName,
      calories: item.energy,
      protein: item.protein,
      carbohydrates: item.carbs,
      netCarbohydrates: item.netCarbs,
      totalFat: item.fat,
      saturatedFat: item.fatTotalSaturated,
      fiber: item.fiber,
      totalSugars: item.sugars,
      addedSugars: item.addedSugars,
      sodium: item.sodium,
      potassium: item.potassium,
      cholesterol: item.cholesterol,
      glycemicIndex: item.gi,
      glycemicLoad: item.gl,
      photoUrl: item.photoUrl,
      servings: item.servings.map((serving) => ({
        id: serving.id,
        quantity: serving.quantity,
        unit: serving.unit,
        scalingFactor: serving.scalingFactor,
        weightGrams: serving.weightGrams,
        isPrimary: serving.isPrimary,
      })),
    })),
  };
}
