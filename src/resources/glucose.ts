import type { GlucosePrediction, PredictGlucoseRequest } from '../models.js';
import { executeRequest } from '../errors.js';
import { GlucoseApi } from '../internal/transport/apis/GlucoseApi.js';

export class GlucoseResource {
  constructor(private readonly api: GlucoseApi) {}

  async predict(request: PredictGlucoseRequest): Promise<GlucosePrediction> {
    const response = await executeRequest(() => this.api.predictGlucose({
      predictGlucoseBody: {
        userProfile: request.userProfile,
        foods: request.foods,
        startTime: request.startTime,
        ...(request.cgmData !== undefined ? {
          cgmData: request.cgmData.map((reading) => ({
            ...reading,
            timestamp: parseTimestamp(reading.timestamp),
          })),
        } : {}),
        ...(request.consumedFoods !== undefined ? {
          consumedFoods: request.consumedFoods.map((food) => ({
            ...food,
            timestamp: parseTimestamp(food.timestamp),
          })),
        } : {}),
      },
      ...(request.endUserId !== undefined ? { xEndUserId: request.endUserId } : {}),
      ...(request.endUserTimezone !== undefined ? { xEndUserTimezone: request.endUserTimezone } : {}),
    }, request.signal ? { signal: request.signal } : undefined));
    return {
      prediction: response.prediction,
      impact: response.impactScore,
      chart: response.chart,
    };
  }
}

function parseTimestamp(value: string): Date {
  const result = new Date(value);
  if (Number.isNaN(result.getTime())) {
    throw new TypeError('CGM and consumed-food timestamps must be ISO-8601 date-times.');
  }
  return result;
}
