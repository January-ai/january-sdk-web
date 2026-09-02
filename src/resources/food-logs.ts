import type {
  CreateFoodLogRequest,
  DeleteFoodLogRequest,
  DeleteFoodLogResponse,
  FoodLog,
  GetFoodLogRequest,
  ListFoodLogsRequest,
  ListFoodLogsResponse,
  UpdateFoodLogRequest,
} from '../models.js';
import { executeRequest } from '../errors.js';
import { FoodLogsApi } from '../internal/transport/apis/FoodLogsApi.js';

export class FoodLogsResource {
  constructor(private readonly api: FoodLogsApi) {}

  async create(request: CreateFoodLogRequest): Promise<FoodLog> {
    const response = await executeRequest(() => this.api.createFoodLog({
      januaryEndUserID: request.endUserId,
      createFoodLogBody: {
        foods: request.foods.map(mapSelection),
        ...(request.timestampUtc !== undefined ? { eatenAt: parseDateTime(request.timestampUtc, 'timestampUtc') } : {}),
        ...(request.name !== undefined ? { name: request.name } : {}),
      },
    }, init(request.signal)));
    return mapFoodLog(response);
  }

  async list(request: ListFoodLogsRequest): Promise<ListFoodLogsResponse> {
    const response = await executeRequest(() => this.api.listFoodLogs({
      januaryEndUserID: request.endUserId,
      startDate: parseDate(request.start, 'start'),
      endDate: parseDate(request.end, 'end'),
      timezone: request.endUserTimezone ?? 'UTC',
    }, init(request.signal)));
    return { totalCount: response.items.length, items: response.items.map(mapFoodLog) };
  }

  async get(request: GetFoodLogRequest): Promise<FoodLog> {
    const response = await executeRequest(() => this.api.getFoodLog({
      januaryEndUserID: request.endUserId,
      logId: request.logId,
    }, init(request.signal)));
    return mapFoodLog(response);
  }

  async update(request: UpdateFoodLogRequest): Promise<FoodLog> {
    const response = await executeRequest(() => this.api.updateFoodLog({
      januaryEndUserID: request.endUserId, logId: request.logId,
      updateFoodLogBody: {
        ...(request.foods !== undefined ? { foods: request.foods.map(mapSelection) } : {}),
        ...(request.timestampUtc !== undefined ? { eatenAt: parseDateTime(request.timestampUtc, 'timestampUtc') } : {}),
        ...(request.name !== undefined ? { name: request.name } : {}),
      },
    }, init(request.signal)));
    return mapFoodLog(response);
  }

  async delete(request: DeleteFoodLogRequest): Promise<DeleteFoodLogResponse> {
    return executeRequest(() => this.api.deleteFoodLog({
      januaryEndUserID: request.endUserId, logId: request.logId,
    }, init(request.signal)));
  }
}

function mapSelection(selection: import('../models.js').FoodSelection) {
  return { foodId: selection.id, servingId: selection.serving.id, quantity: selection.serving.quantity };
}

function mapFoodLog(value: import('../internal/transport/models/FoodLog.js').FoodLog): FoodLog {
  return {
    id: value.id,
    timestampUtc: value.eatenAt.toISOString(),
    name: value.name,
    foods: value.foods.map((food) => ({
      id: food.foodId,
      name: food.name,
      brandName: food.brandName,
      imageUrl: food.imageUrl,
      glycemicIndex: food.glycemicIndex,
      glycemicLoad: food.glycemicLoad,
      nutrients: food.nutrients,
      consumedServing: { id: food.serving.id, quantity: food.quantity },
      servingDetails: {
        id: food.serving.id,
        quantity: food.serving.quantity,
        unit: food.serving.unit,
        weightGrams: food.serving.weightGrams,
      },
    })),
  };
}

function init(signal?: AbortSignal): RequestInit | undefined { return signal ? { signal } : undefined }

function parseDate(value: string, name: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError(`${name} must be an ISO-8601 date.`);
  const result = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(result.getTime())) throw new TypeError(`${name} must be an ISO-8601 date.`);
  return result;
}

function parseDateTime(value: string, name: string): Date {
  const result = new Date(value);
  if (Number.isNaN(result.getTime())) throw new TypeError(`${name} must be an ISO-8601 date-time.`);
  return result;
}
