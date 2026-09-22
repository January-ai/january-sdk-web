import {
  VolumeUnit,
  type CreateWaterLogRequest,
  type DailyWaterTotal,
  type DeleteWaterLogRequest,
  type DeleteWaterLogResponse,
  type ListWaterLogsRequest,
  type ListWaterLogsResponse,
  type WaterLog,
} from '../models.js';
import { executeRequest } from '../errors.js';
import { WaterLogsApi } from '../internal/transport/apis/WaterLogsApi.js';
import { formatDate, init, parseDate, parseDateTime, requireFiniteNumber, requireUnit } from './shared.js';

const volumeUnits = Object.values(VolumeUnit);

/** Water intake for one end user: log an amount, read daily totals, delete an entry. */
export class WaterLogsResource {
  constructor(private readonly api: WaterLogsApi) {}

  /** Logs one amount of water. Not idempotent: a retried create records the water twice. */
  async create(request: CreateWaterLogRequest): Promise<WaterLog> {
    const response = await executeRequest(() => this.api.createWaterLog({
      januaryEndUserID: request.endUserId,
      createWaterLogBody: {
        amount: {
          value: requireFiniteNumber(request.amount.value, 'amount.value'),
          unit: requireUnit(request.amount.unit, volumeUnits, 'amount.unit'),
        },
        ...(request.consumedAt !== undefined ? { consumedAt: parseDateTime(request.consumedAt, 'consumedAt') } : {}),
      },
    }, init(request.signal)));
    return {
      id: response.id,
      amount: { value: response.amount.value, unit: response.amount.unit },
      consumedAt: response.consumedAt.toISOString(),
    };
  }

  /** One total per local calendar day with water logged, oldest first, in the requested unit. */
  async list(request: ListWaterLogsRequest): Promise<ListWaterLogsResponse> {
    const response = await executeRequest(() => this.api.listWaterLogs({
      januaryEndUserID: request.endUserId,
      startDate: parseDate(request.start, 'start'),
      endDate: parseDate(request.end, 'end'),
      timezone: request.endUserTimezone ?? 'UTC',
      unit: requireUnit(request.unit, volumeUnits, 'unit'),
    }, init(request.signal)));
    return { items: response.items.map(mapDailyTotal) };
  }

  /** Deletes a water log. Deleting an unknown or already-deleted log also succeeds. */
  async delete(request: DeleteWaterLogRequest): Promise<DeleteWaterLogResponse> {
    return executeRequest(() => this.api.deleteWaterLog({
      januaryEndUserID: request.endUserId, logId: request.logId,
    }, init(request.signal)));
  }
}

function mapDailyTotal(value: import('../internal/transport/models/DailyWaterTotal.js').DailyWaterTotal): DailyWaterTotal {
  return { date: formatDate(value.date), total: { value: value.total.value, unit: value.total.unit } };
}
