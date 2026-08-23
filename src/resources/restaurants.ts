import type {
  RestaurantResultType,
  SearchRestaurantMenuItemsResponse,
  SearchRestaurantsRequest,
  SearchRestaurantsResponse,
} from '../models.js';
import { executeRequest } from '../errors.js';
import { RestaurantsApi } from '../internal/transport/apis/RestaurantsApi.js';

export class RestaurantsResource {
  constructor(private readonly api: RestaurantsApi) {}

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
    return executeRequest(() => this.api.searchRestaurantMenuItems(parameters(request), init(request.signal)));
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
