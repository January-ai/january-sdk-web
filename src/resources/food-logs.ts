import type {
  CreateFoodLogRequest,
  DeleteFoodLogRequest,
  DeleteFoodLogResponse,
  FoodLog,
  ListFoodLogsRequest,
  ListFoodLogsResponse,
  UpdateFoodLogRequest,
} from '../models.js';
import { executeRequest } from '../errors.js';
import { FoodLogsApi } from '../internal/transport/apis/FoodLogsApi.js';

export class FoodLogsResource {
  constructor(private readonly api: FoodLogsApi) {}

  async create(request: CreateFoodLogRequest): Promise<FoodLog> {
    return executeRequest(() => this.api.createFoodLog({
      xEndUserId: request.endUserId,
      ...(request.endUserTimezone !== undefined ? { xEndUserTimezone: request.endUserTimezone } : {}),
      createFoodLogBody: {
        foods: request.foods,
        ...(request.timestampUtc !== undefined ? { timestampUtc: parseDateTime(request.timestampUtc, 'timestampUtc') } : {}),
        ...(request.name !== undefined ? { name: request.name } : {}),
      },
    }, init(request.signal)));
  }

  async list(request: ListFoodLogsRequest): Promise<ListFoodLogsResponse> {
    return executeRequest(() => this.api.listFoodLogs({
      xEndUserId: request.endUserId,
      start: parseDate(request.start, 'start'),
      end: parseDate(request.end, 'end'),
      ...(request.endUserTimezone !== undefined ? { xEndUserTimezone: request.endUserTimezone } : {}),
    }, init(request.signal)));
  }

  async update(request: UpdateFoodLogRequest): Promise<FoodLog> {
    return executeRequest(() => this.api.updateFoodLog({
      xEndUserId: request.endUserId, logId: request.logId,
      ...(request.endUserTimezone !== undefined ? { xEndUserTimezone: request.endUserTimezone } : {}),
      updateFoodLogBody: {
        ...(request.foods !== undefined ? { foods: request.foods } : {}),
        ...(request.timestampUtc !== undefined ? { timestampUtc: request.timestampUtc } : {}),
        ...(request.name !== undefined ? { name: request.name } : {}),
      },
    }, init(request.signal)));
  }

  async delete(request: DeleteFoodLogRequest): Promise<DeleteFoodLogResponse> {
    return executeRequest(() => this.api.deleteFoodLog({
      xEndUserId: request.endUserId, logId: request.logId,
      ...(request.endUserTimezone !== undefined ? { xEndUserTimezone: request.endUserTimezone } : {}),
    }, init(request.signal)));
  }
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
