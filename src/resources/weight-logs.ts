import {
  WeightUnit,
  type CreateWeightLogRequest,
  type DailyWeight,
  type ListWeightLogsRequest,
  type ListWeightLogsResponse,
  type WeightLog,
} from '../models.js';
import { executeRequest } from '../errors.js';
import { WeightLogsApi } from '../internal/transport/apis/WeightLogsApi.js';
import { formatDate, init, parseDate, parseDateTime, requireFiniteNumber, requireUnit } from './shared.js';

const weightUnits = Object.values(WeightUnit);

/** Body weight for one end user: log a measurement and read the latest weight per day. */
export class WeightLogsResource {
  constructor(private readonly api: WeightLogsApi) {}

  /**
   * Logs one weight measurement. Every measurement is kept; listing shows the latest per local day.
   * Not idempotent: a retried create records the measurement twice.
   */
  async create(request: CreateWeightLogRequest): Promise<WeightLog> {
    const response = await executeRequest(() => this.api.createWeightLog({
      januaryEndUserID: request.endUserId,
      createWeightLogBody: {
        weight: {
          value: requireFiniteNumber(request.weight.value, 'weight.value'),
          unit: requireUnit(request.weight.unit, weightUnits, 'weight.unit'),
        },
        ...(request.measuredAt !== undefined ? { measuredAt: parseDateTime(request.measuredAt, 'measuredAt') } : {}),
      },
    }, init(request.signal)));
    return {
      weight: { value: response.weight.value, unit: response.weight.unit },
      measuredAt: response.measuredAt.toISOString(),
    };
  }

  /** One weight per local calendar day that has one, oldest first, in the unit it was logged in. */
  async list(request: ListWeightLogsRequest): Promise<ListWeightLogsResponse> {
    const response = await executeRequest(() => this.api.listWeightLogs({
      januaryEndUserID: request.endUserId,
      startDate: parseDate(request.start, 'start'),
      endDate: parseDate(request.end, 'end'),
      timezone: request.endUserTimezone ?? 'UTC',
    }, init(request.signal)));
    return { items: response.items.map(mapDailyWeight) };
  }
}

function mapDailyWeight(value: import('../internal/transport/models/DailyWeight.js').DailyWeight): DailyWeight {
  return { date: formatDate(value.date), weight: { value: value.weight.value, unit: value.weight.unit } };
}
