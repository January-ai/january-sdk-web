import type {
  AutocompleteFoodsRequest,
  AutocompleteFoodsResponse,
  FoodSearchItem,
  FoodSearchResults,
  GetFoodRequest,
  LookupFoodByBarcodeRequest,
  SearchFoodsRequest,
  SuggestFoodAlternativesRequest,
  SuggestFoodAlternativesResponse,
} from '../models.js';
import { executeRequest } from '../errors.js';
import { FoodsApi } from '../internal/transport/apis/FoodsApi.js';

export class FoodsResource {
  constructor(private readonly api: FoodsApi) {}

  async autocomplete(request: AutocompleteFoodsRequest): Promise<AutocompleteFoodsResponse> {
    const query = request.query.trim();
    if (query.length > 64) {
      throw new TypeError('Food autocomplete query must contain at most 64 characters.');
    }
    const limit = request.limit ?? 8;
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
      throw new TypeError('Food autocomplete limit must be an integer between 1 and 20.');
    }

    const response = await executeRequest(() => this.api.autocompleteFoods({
      query,
      ...(request.endUserId !== undefined ? { xEndUserId: request.endUserId } : {}),
      ...(request.category !== undefined ? { category: request.category } : {}),
      limit,
    }, request.signal ? { signal: request.signal } : undefined));

    return {
      items: response.items.map((item) => ({
        id: item.id,
        name: item.name,
        brandName: item.brandName ?? null,
        photoUrl: item.imageUrl ?? null,
        nutrients: item.nutrients ?? null,
      })),
    };
  }

  async get(request: GetFoodRequest): Promise<FoodSearchItem> {
    if (!Number.isSafeInteger(request.foodId) || request.foodId <= 0) {
      throw new TypeError('Food ID must be a positive safe integer.');
    }
    const response = await executeRequest(() => this.api.getFood({
      foodId: request.foodId,
      ...(request.endUserId !== undefined ? { xEndUserId: request.endUserId } : {}),
    }, request.signal ? { signal: request.signal } : undefined));
    return mapFoodSearchItem(response);
  }

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
    items: response.items.map(mapFoodSearchItem),
  };
}

function mapFoodSearchItem(item: import('../internal/transport/models/FoodSearchItem.js').FoodSearchItem): FoodSearchItem {
  return {
    id: item.id,
    name: item.name,
    brandName: item.brandName ?? null,
    calories: item.nutrients.calories?.value ?? null,
    protein: item.nutrients.protein?.value ?? null,
    carbohydrates: item.nutrients.carbohydrates?.value ?? null,
    netCarbohydrates: item.nutrients.netCarbohydrates?.value ?? null,
    totalFat: item.nutrients.totalFat?.value ?? null,
    saturatedFat: item.nutrients.saturatedFat?.value ?? null,
    fiber: item.nutrients.fiber?.value ?? null,
    totalSugars: item.nutrients.totalSugars?.value ?? null,
    addedSugars: item.nutrients.addedSugars?.value ?? null,
    sodium: item.nutrients.sodium?.value ?? null,
    potassium: item.nutrients.potassium?.value ?? null,
    cholesterol: item.nutrients.cholesterol?.value ?? null,
    glycemicIndex: item.glycemicIndex ?? null,
    glycemicLoad: item.glycemicLoad ?? null,
    photoUrl: item.imageUrl ?? null,
    upc: item.upc ?? null,
    servings: item.servings.map((serving) => ({
      id: serving.id,
      quantity: serving.quantity,
      unit: serving.unit,
      scalingFactor: serving.scalingFactor ?? 1,
      weightGrams: serving.weightGrams ?? null,
      isPrimary: serving.isPrimary,
    })),
    nutrients: item.nutrients,
  };
}
