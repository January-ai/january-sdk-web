import type {
  RestaurantResultType,
  GetRestaurantMenuItemsRequest,
  SearchRestaurantMenuItemsResponse,
  SearchRestaurantsRequest,
  SearchRestaurantsResponse,
} from '../models.js';
import { executeRequest } from '../errors.js';
import { RestaurantsApi } from '../internal/transport/apis/RestaurantsApi.js';

export class RestaurantsResource {
  constructor(private readonly api: RestaurantsApi) {}

  /** Loads one page by restaurant ID, independently of text search or location. */
  async getMenuItems(request: GetRestaurantMenuItemsRequest): Promise<SearchRestaurantMenuItemsResponse> {
    const limit = request.limit ?? 100;
    const offset = request.offset ?? 0;
    if (!/^[A-Za-z0-9_-]{1,256}$/.test(request.restaurantId) || !Number.isInteger(limit) || limit < 1 || limit > 100
      || !Number.isInteger(offset) || offset < 0 || offset > 2_147_483_647) {
      throw new TypeError('A restaurant id and valid menu pagination are required.');
    }
    return mapMenu(await executeRequest(() => this.api.getRestaurantMenuItems({
      restaurantId: request.restaurantId, limit, offset,
      ...(request.endUserId !== undefined ? { xEndUserId: request.endUserId } : {}),
    }, init(request.signal))));
  }

  async search(request: SearchRestaurantsRequest): Promise<SearchRestaurantsResponse> {
    validate(request);
    const response = await executeRequest(() => this.api.searchRestaurants(parameters(request), init(request.signal)));
    return {
      totalCount: response.totalCount,
      items: response.items.map((item) => ({ ...item, type: item.type as RestaurantResultType })),
    };
  }

  async searchMenuItems(request: SearchRestaurantsRequest): Promise<SearchRestaurantMenuItemsResponse> {
    validate(request);
    return mapMenu(await executeRequest(() => this.api.searchRestaurantMenuItems(parameters(request), init(request.signal))));
  }
}

function parameters(request: SearchRestaurantsRequest) {
  return {
    query: request.query.trim(), latitude: request.latitude, longitude: request.longitude,
    ...(request.radius !== undefined ? { radius: request.radius } : {}),
    ...(request.limit !== undefined ? { limit: request.limit } : {}),
    ...(request.endUserId !== undefined ? { xEndUserId: request.endUserId } : {}),
  };
}

function validate(request: SearchRestaurantsRequest): void {
  const query = request.query.trim();
  if (query.length === 0 || query.length > 256) throw new TypeError('Restaurant search query must contain between 1 and 256 characters.');
  if (request.latitude < -90 || request.latitude > 90 || request.longitude < -180 || request.longitude > 180) {
    throw new TypeError('Restaurant coordinates are outside the valid range.');
  }
  if (request.radius !== undefined && (request.radius < 1 || request.radius > 17_000)) throw new TypeError('Restaurant radius is outside the valid range.');
  if (request.limit !== undefined && (!Number.isInteger(request.limit) || request.limit < 1 || request.limit > 100)) {
    throw new TypeError('Restaurant limit must be an integer between 1 and 100.');
  }
}

function init(signal?: AbortSignal): RequestInit | undefined { return signal ? { signal } : undefined }

function mapMenu(response: import('../internal/transport/models/SearchRestaurantMenuItemsResponse.js').SearchRestaurantMenuItemsResponse): SearchRestaurantMenuItemsResponse {
  return { totalCount: response.totalCount, items: response.items.map(item => ({
    type: item.type, id: item.id, name: item.name, restaurantName: item.restaurantName,
    isChain: item.isChain, distance: item.distance, photoUrl: item.imageUrl,
    energy: item.nutrients?.calories?.value, protein: item.nutrients?.protein?.value,
    carbs: item.nutrients?.carbohydrates?.value, netCarbs: item.nutrients?.netCarbohydrates?.value,
    fat: item.nutrients?.totalFat?.value, fiber: item.nutrients?.fiber?.value,
    sugars: item.nutrients?.totalSugars?.value, addedSugars: item.nutrients?.addedSugars?.value,
    gi: item.glycemicIndex, gl: item.glycemicLoad,
    servings: item.servings.map(serving => ({ ...serving, scalingFactor: serving.scalingFactor ?? 1, weightGrams: serving.weightGrams ?? null })),
  })) };
}
