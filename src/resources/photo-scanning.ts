import type { CorrectPhotoScanRequest, PhotoScan, ScanFoodPhotoRequest } from '../models.js';
import { executeRequest } from '../errors.js';
import { PhotoScanningApi } from '../internal/transport/apis/PhotoScanningApi.js';

export class PhotoScanningResource {
  constructor(private readonly api: PhotoScanningApi) {}

  async scan(request: ScanFoodPhotoRequest): Promise<PhotoScan> {
    if (!request.image.trim()) throw new TypeError('A base64-encoded image is required.');
    return executeRequest(() => this.api.scanFoodPhoto({
      scanFoodPhotoBody: { image: request.image },
      ...(request.endUserId !== undefined ? { xEndUserId: request.endUserId } : {}),
    }, request.signal ? { signal: request.signal } : undefined));
  }

  async correct(request: CorrectPhotoScanRequest): Promise<PhotoScan> {
    return executeRequest(() => this.api.correctPhotoScan({
      correctPhotoScanBody: {
        mealName: request.mealName,
        detections: request.detections,
        userInput: request.userInput,
      },
      ...(request.endUserId !== undefined ? { xEndUserId: request.endUserId } : {}),
    }, request.signal ? { signal: request.signal } : undefined));
  }
}
