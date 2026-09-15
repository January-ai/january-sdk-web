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
        analysis: toTransportFoodScan(request.analysis),
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
        serving: { ...detection.food.serving },
        quantity: detection.food.quantity,
      },
    })),
  };
}

function toTransportFoodScan(scan: FoodScan): import('../internal/transport/models/FoodScan.js').FoodScan {
  return {
    mealName: scan.mealName,
    totalNutrients: scan.totalNutrients,
    detections: scan.detections.map((detection) => ({
      confidence: detection.confidenceScore ?? null,
      food: {
        id: detection.food.id ?? null,
        name: detection.food.name,
        brandName: detection.food.brandName ?? null,
        nutrients: detection.food.nutrients,
        quantity: detection.food.quantity ?? null,
        serving: {
          id: detection.food.serving.id,
          quantity: detection.food.serving.quantity ?? null,
          unit: detection.food.serving.unit,
        },
      },
    })),
  };
}
