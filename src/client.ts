import { Configuration } from './internal/transport/runtime.js';
import { FoodsApi } from './internal/transport/apis/FoodsApi.js';
import { FoodLogsApi } from './internal/transport/apis/FoodLogsApi.js';
import { GlucoseApi } from './internal/transport/apis/GlucoseApi.js';
import { PhotoScanningApi } from './internal/transport/apis/PhotoScanningApi.js';
import { RestaurantsApi } from './internal/transport/apis/RestaurantsApi.js';
import { FoodsResource } from './resources/foods.js';
import { FoodLogsResource } from './resources/food-logs.js';
import { GlucoseResource } from './resources/glucose.js';
import { PhotoScanningResource } from './resources/photo-scanning.js';
import { RestaurantsResource } from './resources/restaurants.js';

const SDK_VERSION = '0.1.0';
const DEVELOPMENT_BASE_URL = 'https://partners.dev.january.ai';

export interface JanuaryPartnerClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

export class JanuaryPartnerClient {
  readonly foods: FoodsResource;
  readonly restaurants: RestaurantsResource;
  readonly photoScanning: PhotoScanningResource;
  readonly foodLogs: FoodLogsResource;
  readonly glucose: GlucoseResource;

  constructor(options: JanuaryPartnerClientOptions) {
    if (!options.apiKey.trim()) throw new TypeError('A development API key is required.');

    const configuration = new Configuration({
      basePath: (options.baseUrl ?? DEVELOPMENT_BASE_URL).replace(/\/+$/, ''),
      accessToken: options.apiKey,
      headers: {
        'User-Agent': `JanuaryPartnerSDK-Node/${SDK_VERSION} TypeScript/7 Node`,
      },
      ...(options.fetch !== undefined ? { fetchApi: options.fetch } : {}),
    });

    const photoScanningApi = new PhotoScanningApi(configuration);
    this.foods = new FoodsResource(new FoodsApi(configuration), photoScanningApi);
    this.restaurants = new RestaurantsResource(new RestaurantsApi(configuration));
    this.photoScanning = new PhotoScanningResource(photoScanningApi);
    this.foodLogs = new FoodLogsResource(new FoodLogsApi(configuration));
    this.glucose = new GlucoseResource(new GlucoseApi(configuration));
  }
}
