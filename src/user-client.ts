import type {
  AutocompleteFoodsResponse,
  AutocompleteFoodsRequest,
  CorrectPhotoScanRequest,
  CreateFoodLogRequest,
  DeleteFoodLogResponse,
  DeleteFoodLogRequest,
  FoodLog,
  FoodScan,
  FoodSearchItem,
  FoodSearchResults,
  GetFoodRequest,
  GetRestaurantMenuItemsRequest,
  GlucosePrediction,
  ListFoodLogsRequest,
  ListFoodLogsResponse,
  LookupFoodByBarcodeRequest,
  PartnerUserContext,
  PredictGlucoseRequest,
  ScanFoodPhotoRequest,
  SearchFoodsByNaturalLanguageRequest,
  SearchFoodsRequest,
  SearchRestaurantMenuItemsResponse,
  SearchRestaurantsRequest,
  SearchRestaurantsResponse,
  SuggestFoodAlternativesRequest,
  SuggestFoodAlternativesResponse,
  UpdateFoodLogRequest,
} from './models.js';
import type { FoodsResource } from './resources/foods.js';
import type { FoodLogsResource } from './resources/food-logs.js';
import type { GlucoseResource } from './resources/glucose.js';
import type { FoodAnalysisResource } from './resources/photo-scanning.js';
import type { RestaurantsResource } from './resources/restaurants.js';

type WithoutUserContext<T> = Omit<T, keyof PartnerUserContext>;
type WithoutUserId<T> = Omit<T, 'endUserId'>;

export type UserAutocompleteFoodsRequest = WithoutUserId<AutocompleteFoodsRequest>;
export type UserGetFoodRequest = WithoutUserId<GetFoodRequest>;
export type UserSearchFoodsRequest = WithoutUserId<SearchFoodsRequest>;
export type UserLookupFoodByBarcodeRequest = WithoutUserId<LookupFoodByBarcodeRequest>;
export type UserSearchFoodsByNaturalLanguageRequest = WithoutUserId<SearchFoodsByNaturalLanguageRequest>;
export type UserSuggestFoodAlternativesRequest = WithoutUserId<SuggestFoodAlternativesRequest>;
export type UserGetRestaurantMenuItemsRequest = WithoutUserId<GetRestaurantMenuItemsRequest>;
export type UserSearchRestaurantsRequest = WithoutUserId<SearchRestaurantsRequest>;
export type UserScanFoodPhotoRequest = WithoutUserId<ScanFoodPhotoRequest>;
export type UserCorrectPhotoScanRequest = WithoutUserId<CorrectPhotoScanRequest>;
export type UserCreateFoodLogRequest = WithoutUserContext<CreateFoodLogRequest>;
export type UserListFoodLogsRequest = WithoutUserContext<ListFoodLogsRequest>;
export type UserUpdateFoodLogRequest = WithoutUserContext<UpdateFoodLogRequest>;
export type UserDeleteFoodLogRequest = WithoutUserContext<DeleteFoodLogRequest>;
export type UserPredictGlucoseRequest = WithoutUserContext<PredictGlucoseRequest>;

/** Food operations bound to one partner-owned end-user identity. */
export interface UserFoodsResource {
  /** Returns autocomplete suggestions for a partial food query. */
  autocomplete(request: UserAutocompleteFoodsRequest): Promise<AutocompleteFoodsResponse>;
  /** Hydrates a food with its complete serving choices. */
  get(request: UserGetFoodRequest): Promise<FoodSearchItem>;
  /** Searches January's food database. */
  search(request: UserSearchFoodsRequest): Promise<FoodSearchResults>;
  /** Looks up foods by barcode. */
  lookupBarcode(request: UserLookupFoodByBarcodeRequest): Promise<FoodSearchResults>;
  /** Suggests alternatives for a food. */
  suggestAlternatives(
    request: UserSuggestFoodAlternativesRequest,
  ): Promise<SuggestFoodAlternativesResponse>;
}

class DefaultUserFoodsResource implements UserFoodsResource {
  constructor(
    private readonly resource: FoodsResource,
    private readonly context: Readonly<PartnerUserContext>,
  ) {}

  autocomplete(request: UserAutocompleteFoodsRequest) {
    return this.resource.autocomplete({ ...request, endUserId: this.context.endUserId });
  }

  get(request: UserGetFoodRequest) {
    return this.resource.get({ ...request, endUserId: this.context.endUserId });
  }

  search(request: UserSearchFoodsRequest) {
    return this.resource.search({ ...request, endUserId: this.context.endUserId });
  }

  lookupBarcode(request: UserLookupFoodByBarcodeRequest) {
    return this.resource.lookupBarcode({ ...request, endUserId: this.context.endUserId });
  }

  suggestAlternatives(request: UserSuggestFoodAlternativesRequest) {
    return this.resource.suggestAlternatives({ ...request, endUserId: this.context.endUserId });
  }
}

/** Restaurant operations bound to one partner-owned end-user identity. */
export interface UserRestaurantsResource {
  getMenuItems(request: UserGetRestaurantMenuItemsRequest): Promise<SearchRestaurantMenuItemsResponse>;
  /** Searches restaurants near a location. */
  search(request: UserSearchRestaurantsRequest): Promise<SearchRestaurantsResponse>;
  /** Searches restaurant menu items near a location. */
  searchMenuItems(request: UserSearchRestaurantsRequest): Promise<SearchRestaurantMenuItemsResponse>;
}

class DefaultUserRestaurantsResource implements UserRestaurantsResource {
  constructor(
    private readonly resource: RestaurantsResource,
    private readonly context: Readonly<PartnerUserContext>,
  ) {}

  getMenuItems(request: UserGetRestaurantMenuItemsRequest) {
    return this.resource.getMenuItems({ ...request, endUserId: this.context.endUserId });
  }

  search(request: UserSearchRestaurantsRequest) {
    return this.resource.search({ ...request, endUserId: this.context.endUserId });
  }

  searchMenuItems(request: UserSearchRestaurantsRequest) {
    return this.resource.searchMenuItems({ ...request, endUserId: this.context.endUserId });
  }
}

/** Food-analysis operations bound to one partner-owned end-user identity. */
export interface UserFoodAnalysisResource {
  /** Analyzes a prepared food-photo data URI. */
  analyzePhoto(request: UserScanFoodPhotoRequest): Promise<FoodScan>;
  /** Analyzes a natural-language meal description. */
  analyzeDescription(request: UserSearchFoodsByNaturalLanguageRequest): Promise<FoodScan>;
  /** Applies a correction to a previous analysis. */
  correct(request: UserCorrectPhotoScanRequest): Promise<FoodScan>;
}

class DefaultUserFoodAnalysisResource implements UserFoodAnalysisResource {
  constructor(
    private readonly resource: FoodAnalysisResource,
    private readonly context: Readonly<PartnerUserContext>,
  ) {}

  analyzePhoto(request: UserScanFoodPhotoRequest) {
    return this.resource.analyzePhoto({ ...request, endUserId: this.context.endUserId });
  }

  analyzeDescription(request: UserSearchFoodsByNaturalLanguageRequest) {
    return this.resource.analyzeDescription({ ...request, endUserId: this.context.endUserId });
  }

  correct(request: UserCorrectPhotoScanRequest) {
    return this.resource.correct({ ...request, endUserId: this.context.endUserId });
  }
}

/** Food-log operations bound to one user and optional timezone. */
export interface UserFoodLogsResource {
  /** Creates a food log. */
  create(request: UserCreateFoodLogRequest): Promise<FoodLog>;
  /** Lists food logs in an inclusive calendar-date range. */
  list(request: UserListFoodLogsRequest): Promise<ListFoodLogsResponse>;
  /** Updates an existing food log. */
  update(request: UserUpdateFoodLogRequest): Promise<FoodLog>;
  /** Deletes a food log. */
  delete(request: UserDeleteFoodLogRequest): Promise<DeleteFoodLogResponse>;
}

class DefaultUserFoodLogsResource implements UserFoodLogsResource {
  constructor(
    private readonly resource: FoodLogsResource,
    private readonly context: Readonly<PartnerUserContext>,
  ) {}

  create(request: UserCreateFoodLogRequest) {
    return this.resource.create({ ...request, ...this.context });
  }

  list(request: UserListFoodLogsRequest) {
    return this.resource.list({ ...request, ...this.context });
  }

  update(request: UserUpdateFoodLogRequest) {
    return this.resource.update({ ...request, ...this.context });
  }

  delete(request: UserDeleteFoodLogRequest) {
    return this.resource.delete({ ...request, ...this.context });
  }
}

/** Glucose operations bound to one user and optional timezone. */
export interface UserGlucoseResource {
  /** Predicts the glucose response for a meal. */
  predict(request: UserPredictGlucoseRequest): Promise<GlucosePrediction>;
}

class DefaultUserGlucoseResource implements UserGlucoseResource {
  constructor(
    private readonly resource: GlucoseResource,
    private readonly context: Readonly<PartnerUserContext>,
  ) {}

  predict(request: UserPredictGlucoseRequest) {
    return this.resource.predict({ ...request, ...this.context });
  }
}

/** A lightweight, immutable client scoped to one signed-in application user. */
export interface JanuaryPartnerUserClient {
  readonly context: Readonly<PartnerUserContext>;
  readonly foods: UserFoodsResource;
  readonly restaurants: UserRestaurantsResource;
  readonly foodAnalysis: UserFoodAnalysisResource;
  readonly foodLogs: UserFoodLogsResource;
  readonly glucose: UserGlucoseResource;
}

class DefaultJanuaryPartnerUserClient implements JanuaryPartnerUserClient {
  readonly context: Readonly<PartnerUserContext>;
  readonly foods: UserFoodsResource;
  readonly restaurants: UserRestaurantsResource;
  readonly foodAnalysis: UserFoodAnalysisResource;
  readonly foodLogs: UserFoodLogsResource;
  readonly glucose: UserGlucoseResource;

  constructor(
    resources: {
      foods: FoodsResource;
      restaurants: RestaurantsResource;
      foodAnalysis: FoodAnalysisResource;
      foodLogs: FoodLogsResource;
      glucose: GlucoseResource;
    },
    context: PartnerUserContext,
  ) {
    const endUserId = context.endUserId.trim();
    if (!endUserId) throw new TypeError('A partner end-user ID is required.');
    const endUserTimezone = context.endUserTimezone?.trim();
    this.context = Object.freeze({
      endUserId,
      ...(endUserTimezone ? { endUserTimezone } : {}),
    });
    this.foods = new DefaultUserFoodsResource(resources.foods, this.context);
    this.restaurants = new DefaultUserRestaurantsResource(resources.restaurants, this.context);
    this.foodAnalysis = new DefaultUserFoodAnalysisResource(resources.foodAnalysis, this.context);
    this.foodLogs = new DefaultUserFoodLogsResource(resources.foodLogs, this.context);
    this.glucose = new DefaultUserGlucoseResource(resources.glucose, this.context);
  }
}

/** @internal Creates the scoped client returned by JanuaryPartnerClient.forUser. */
export function createJanuaryPartnerUserClient(
  resources: {
    foods: FoodsResource;
    restaurants: RestaurantsResource;
    foodAnalysis: FoodAnalysisResource;
    foodLogs: FoodLogsResource;
    glucose: GlucoseResource;
  },
  context: PartnerUserContext,
): JanuaryPartnerUserClient {
  return new DefaultJanuaryPartnerUserClient(resources, context);
}
