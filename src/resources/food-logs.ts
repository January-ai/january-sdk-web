import type {
  CreateFoodLogRequest,
  DeleteFoodLogRequest,
  DeleteFoodLogResponse,
  FoodLog,
  FoodLogSummary,
  GetFoodLogRequest,
  GetFoodLogSummaryRequest,
  ListFoodLogsRequest,
  ListFoodLogsResponse,
  UpdateFoodLogRequest,
} from '../models.js';
import { executeRequest } from '../errors.js';
import { FoodLogsApi } from '../internal/transport/apis/FoodLogsApi.js';
import { formatDate, init, parseDate, parseDateTime } from './shared.js';

export class FoodLogsResource {
  constructor(private readonly api: FoodLogsApi) {}

  async create(request: CreateFoodLogRequest): Promise<FoodLog> {
    const response = await executeRequest(() => this.api.createFoodLog({
      januaryEndUserID: request.endUserId,
      createFoodLogBody: {
        foods: request.foods.map(mapSelection),
        ...(request.timestampUtc !== undefined ? { createdAt: parseDateTime(request.timestampUtc, 'timestampUtc') } : {}),
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

  async getSummary(request: GetFoodLogSummaryRequest): Promise<FoodLogSummary> {
    const response = await executeRequest(() => this.api.getFoodLogSummary({
      januaryEndUserID: request.endUserId,
      startDate: parseDate(request.start, 'start'),
      endDate: parseDate(request.end, 'end'),
      timezone: request.endUserTimezone ?? 'UTC',
      groupBy: request.groupBy ?? 'day',
      weekStart: request.weekStart ?? 'monday',
    }, init(request.signal)));
    return {
      groupBy: response.groupBy === 'week' ? 'week' : 'day',
      weekStart: response.weekStart === 'sunday' ? 'sunday' : response.weekStart === 'monday' ? 'monday' : null,
      timezone: response.timezone,
      startDate: formatDate(response.startDate),
      endDate: formatDate(response.endDate),
      buckets: response.buckets.map((bucket) => ({
        startDate: formatDate(bucket.startDate),
        endDate: formatDate(bucket.endDate),
        logsCount: bucket.logsCount,
        daysWithLogs: bucket.daysWithLogs,
        nutrients: bucket.nutrients,
      })),
      totals: {
        logsCount: response.totals.logsCount,
        daysWithLogs: response.totals.daysWithLogs,
        nutrients: response.totals.nutrients,
      },
      averagePerLoggedDay: { nutrients: response.averagePerLoggedDay.nutrients },
    };
  }

  async get(request: GetFoodLogRequest): Promise<FoodLog> {
    const response = await executeRequest(() => this.api.getFoodLog({
      januaryEndUserID: request.endUserId,
      logId: request.logId,
    }, init(request.signal)));
    return mapFoodLog(response);
  }

  async update(request: UpdateFoodLogRequest): Promise<FoodLog> {
    // The API rejects an empty patch and any key it does not know, so only the fields the
    // caller set are serialized.
    const updateFoodLogBody = {
      ...(request.foods !== undefined ? { foods: request.foods.map(mapSelection) } : {}),
      ...(request.timestampUtc !== undefined ? { createdAt: parseDateTime(request.timestampUtc, 'timestampUtc') } : {}),
      ...(request.name !== undefined ? { name: request.name } : {}),
    };
    if (Object.keys(updateFoodLogBody).length === 0) {
      throw new TypeError('Provide at least one of foods, timestampUtc, or name to update.');
    }
    const response = await executeRequest(() => this.api.updateFoodLog({
      januaryEndUserID: request.endUserId, logId: request.logId,
      updateFoodLogBody,
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
    timestampUtc: value.createdAt.toISOString(),
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


