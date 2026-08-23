import type { GlucosePrediction, PredictGlucoseRequest } from '../models.js';
import { executeRequest } from '../errors.js';
import { GlucoseApi } from '../internal/transport/apis/GlucoseApi.js';

export class GlucoseResource {
  constructor(private readonly api: GlucoseApi) {}

  async predict(request: PredictGlucoseRequest): Promise<GlucosePrediction> {
    return executeRequest(() => this.api.predictGlucose({
      predictGlucoseBody: {
        userProfile: request.userProfile,
        foods: request.foods,
        startTime: request.startTime,
        ...(request.cgmData !== undefined ? { cgmData: request.cgmData } : {}),
        ...(request.consumedFoods !== undefined ? { consumedFoods: request.consumedFoods } : {}),
      },
      ...(request.endUserId !== undefined ? { xEndUserId: request.endUserId } : {}),
      ...(request.endUserTimezone !== undefined ? { xEndUserTimezone: request.endUserTimezone } : {}),
    }, request.signal ? { signal: request.signal } : undefined));
  }
}
