import type {
  CorrectPhotoScanRequest,
  FoodScan,
  ScanFoodPhotoRequest,
  SearchFoodsByNaturalLanguageRequest,
} from '../models.js';
import { executeRequest } from '../errors.js';
import { PhotoScanningApi } from '../internal/transport/apis/PhotoScanningApi.js';

/** Analyzes food from photos or natural-language descriptions. */
export class FoodAnalysisResource {
  constructor(private readonly api: PhotoScanningApi) {}

  async analyzePhoto(request: ScanFoodPhotoRequest): Promise<FoodScan> {
    if (!request.image.trim()) throw new TypeError('A base64-encoded image is required.');
    return mapFoodScan(await executeRequest(() => this.api.scanFoodPhoto({
      scanFoodPhotoBody: {
        image: request.image,
        ...(request.reasoningEffort !== undefined ? { reasoning: { effort: request.reasoningEffort } } : {}),
      },
    }, request.signal ? { signal: request.signal } : undefined)));
  }

  async analyzeDescription(request: SearchFoodsByNaturalLanguageRequest): Promise<FoodScan> {
    const query = request.query.trim();
    if (query.length === 0) throw new TypeError('A meal description is required.');
    return mapFoodScan(await executeRequest(() => this.api.searchFoodsByNaturalLanguage({
      searchFoodsByNaturalLanguageBody: { text: query },
    }, request.signal ? { signal: request.signal } : undefined)));
  }

  async correct(request: CorrectPhotoScanRequest): Promise<FoodScan> {
    return mapFoodScan(await executeRequest(() => this.api.correctPhotoScan({
      correctPhotoScanBody: {
        analysis: toCorrectionAnalysis(request.analysis),
        instruction: request.instruction,
      },
    }, request.signal ? { signal: request.signal } : undefined)));
  }
}

function mapFoodScan(scan: import('../internal/transport/models/FoodScan.js').FoodScan): FoodScan {
  return {
    mealName: scan.mealName,
    totalNutrients: scan.totalNutrients,
    detections: scan.detections.map((detection) => ({
      confidenceScore: detection.confidence ?? undefined,
      food: {
        id: detection.food.id,
        name: detection.food.name,
        brandName: detection.food.brandName,
        nutrients: detection.food.nutrients,
        serving: {
          id: detection.food.serving.id,
          quantity: detection.food.serving.quantity,
          unit: detection.food.serving.unit,
          weightGrams: detection.food.serving.weightGrams ?? null,
        },
        quantity: detection.food.quantity,
      },
    })),
  };
}

// A correction sends the prior scan back field for field; only the wrapper type differs, so
// nothing may be dropped or defaulted here. A missing serving weight is sent as unknown.
function toCorrectionAnalysis(scan: FoodScan): import('../internal/transport/models/CorrectionAnalysis.js').CorrectionAnalysis {
  return {
    mealName: scan.mealName,
    totalNutrients: scan.totalNutrients,
    detections: scan.detections.map((detection) => ({
      confidence: detection.confidenceScore ?? null,
      food: {
        id: detection.food.id,
        name: detection.food.name,
        brandName: detection.food.brandName ?? null,
        nutrients: detection.food.nutrients,
        quantity: detection.food.quantity,
        serving: {
          id: detection.food.serving.id,
          quantity: detection.food.serving.quantity,
          unit: detection.food.serving.unit,
          weightGrams: detection.food.serving.weightGrams ?? null,
        },
      },
    })),
  };
}
