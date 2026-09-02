export const FoodCategory = {
  generic: 'generic',
  /** @deprecated Use generic. */
  general: 'generic',
  branded: 'branded',
  recipe: 'recipe',
} as const;

export type FoodCategory = typeof FoodCategory[keyof typeof FoodCategory];

export const AutocompleteFoodCategory = {
  generic: 'generic',
  /** @deprecated Use generic. */
  general: 'generic',
  branded: 'branded',
} as const;

export type AutocompleteFoodCategory = typeof AutocompleteFoodCategory[keyof typeof AutocompleteFoodCategory];

export interface AutocompleteFoodsRequest {
  query: string;
  category?: AutocompleteFoodCategory;
  limit?: number;
  endUserId?: string;
  signal?: AbortSignal;
}

export interface FoodSuggestion {
  id: ContractFoodSuggestion['id'];
  name: ContractFoodSuggestion['name'];
  brandName: ContractFoodSuggestion['brandName'];
  photoUrl: ContractFoodSuggestion['imageUrl'];
  nutrients: NutritionFacts | null;
}

export interface AutocompleteFoodsResponse { items: FoodSuggestion[] }

export interface GetFoodRequest {
  foodId: ContractFoodSearchItem['id'];
  endUserId?: string;
  signal?: AbortSignal;
}

export interface SearchFoodsRequest {
  query: string;
  category?: FoodCategory;
  limit?: number;
  endUserId?: string;
  signal?: AbortSignal;
}

export interface FoodSearchResults {
  totalCount: number;
  items: FoodSearchItem[];
}

export interface FoodSearchItem {
  id: ContractFoodSearchItem['id'];
  type: FoodCategory;
  name: ContractFoodSearchItem['name'];
  brandName: ContractFoodSearchItem['brandName'];
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  netCarbohydrates: number | null;
  totalFat: number | null;
  saturatedFat: number | null;
  fiber: number | null;
  totalSugars: number | null;
  addedSugars: number | null;
  sodium: number | null;
  potassium: number | null;
  cholesterol: number | null;
  glycemicIndex: ContractFoodSearchItem['glycemicIndex'];
  glycemicLoad: ContractFoodSearchItem['glycemicLoad'];
  photoUrl: ContractFoodSearchItem['imageUrl'];
  barcode: ContractFoodSearchItem['barcode'];
  servings: ServingOption[];
  nutrients: NutritionFacts | null;
}

export interface ServingOption {
  id: ContractServingOption['id'];
  quantity: ContractServingOption['quantity'];
  unit: ContractServingOption['unit'];
  scalingFactor: ContractServingOption['scalingFactor'];
  weightGrams: ContractServingOption['weightGrams'];
  isPrimary: ContractServingOption['isPrimary'];
}

export interface NutrientAmount {
  value: number;
  unit: string;
}

export interface CompleteScanNutritionFacts {
  calories?: NutrientAmount;
  protein?: NutrientAmount;
  carbohydrates?: NutrientAmount;
  netCarbohydrates?: NutrientAmount;
  totalFat?: NutrientAmount;
  saturatedFat?: NutrientAmount;
  fiber?: NutrientAmount;
  totalSugars?: NutrientAmount;
  addedSugars?: NutrientAmount;
  sodium?: NutrientAmount;
}

export interface NutritionFacts extends CompleteScanNutritionFacts {
  transFat?: NutrientAmount;
  cholesterol?: NutrientAmount;
  calcium?: NutrientAmount;
  iron?: NutrientAmount;
  potassium?: NutrientAmount;
  vitaminD?: NutrientAmount;
}

export interface LookupFoodByBarcodeRequest {
  upc: string;
  endUserId?: string;
  signal?: AbortSignal;
}

export interface SearchFoodsByNaturalLanguageRequest {
  query: string;
  endUserId?: string;
  signal?: AbortSignal;
}

export interface NaturalLanguageServing {
  id: string | null;
  quantity?: number | null;
  unit: string | null;
  selectedQuantity?: number;
}

export interface NaturalLanguageFood {
  id?: string | null;
  name: string | null;
  brandName?: string | null;
  nutrients: CompleteScanNutritionFacts;
  servings?: NaturalLanguageServing[];
}

export interface NaturalLanguageFoodDetection {
  food: NaturalLanguageFood;
}

export type SearchFoodsByNaturalLanguageResponse = FoodScan;

export const DietRestriction = {
  gluten: 'gluten', lactose: 'lactose', yeast: 'yeast', treeNuts: 'tree_nuts',
  peanuts: 'peanuts', dairy: 'dairy', eggs: 'eggs', sulfites: 'sulfites', soy: 'soy', wheat: 'wheat',
  shellfish: 'shellfish', fish: 'fish', mushrooms: 'mushrooms', sesame: 'sesame',
  monosodiumGlutamate: 'msg', caffeine: 'caffeine', fodmaps: 'fodmaps',
} as const;
export type DietRestriction = typeof DietRestriction[keyof typeof DietRestriction];

export const DietPreference = {
  vegetarian: 'vegetarian', vegan: 'vegan', keto: 'keto', paleo: 'paleo',
  pescatarian: 'pescatarian', lowCarbohydrate: 'low_carbohydrate', highProtein: 'high_protein',
  kosher: 'kosher', halal: 'halal',
} as const;
export type DietPreference = typeof DietPreference[keyof typeof DietPreference];

export interface SuggestFoodAlternativesRequest {
  foodId: string;
  dietRestrictions: DietRestriction[];
  dietPreferences: DietPreference[];
  endUserId?: string;
  signal?: AbortSignal;
}

export interface DetectedServing {
  id: string | null;
  quantity?: number | null;
  unit: string | null;
  selectedQuantity?: number | null;
}

export interface DetectedFood {
  id?: string | null;
  name: string | null;
  brandName?: string | null;
  nutrients: CompleteScanNutritionFacts;
  servings?: DetectedServing[];
}

export type FoodAlternative = DetectedFood;
export interface SuggestFoodAlternativesResponse { alternatives: FoodAlternative[] }

export interface GetRestaurantMenuItemsRequest {
  restaurantId: ContractRestaurant['id'];
  limit?: number;
  offset?: number;
  endUserId?: string;
  signal?: AbortSignal;
}

export interface SearchRestaurantsRequest {
  query: string;
  latitude: number;
  longitude: number;
  radius?: number;
  limit?: number;
  endUserId?: string;
  signal?: AbortSignal;
}

export const RestaurantResultType = { restaurant: 'restaurant', menuItem: 'menu_item' } as const;
export type RestaurantResultType = typeof RestaurantResultType[keyof typeof RestaurantResultType];

export interface Restaurant {
  type: RestaurantResultType;
  id: ContractRestaurant['id'];
  name: ContractRestaurant['name'];
  isChain?: ContractRestaurant['isChain'];
  distance?: ContractRestaurant['distanceMeters'];
  city?: ContractRestaurant['city'];
  address1?: ContractRestaurant['address1'];
  address2?: ContractRestaurant['address2'];
}

export interface SearchRestaurantsResponse { totalCount: number; items: Restaurant[] }

export interface RestaurantMenuItem {
  type: ContractRestaurantMenuItem['type'];
  id: ContractRestaurantMenuItem['id'];
  name: ContractRestaurantMenuItem['name'];
  restaurantName: ContractRestaurantMenuItem['restaurantName'];
  isChain?: boolean | null;
  energy?: number | null;
  protein?: number | null;
  carbs?: number | null;
  netCarbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  sugars?: number | null;
  addedSugars?: number | null;
  gi?: number | null;
  gl?: number | null;
  photoUrl?: string | null;
  distance?: number | null;
  servings: ServingOption[];
}

export interface SearchRestaurantMenuItemsResponse { totalCount: number; items: RestaurantMenuItem[] }

export interface RestaurantMenuEntry {
  id: string | null;
  name: string | null;
  energy?: number | null;
  protein?: number | null;
  carbs?: number | null;
  netCarbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  sugars?: number | null;
  addedSugars?: number | null;
  gi?: number | null;
  gl?: number | null;
  servings: ServingOption[];
}
export interface GetRestaurantMenuItemsResponse { items: RestaurantMenuEntry[] }

export interface ScanFoodPhotoRequest {
  image: string;
  endUserId?: string;
  signal?: AbortSignal;
}

export interface FoodDetection { confidenceScore?: string; food: DetectedFood }
export interface GlucosePredictionPoint { minutes: number; value: number }
export interface FoodScanGlucoseImpact { impactScore: string; prediction: GlucosePredictionPoint[] }
export interface FoodScan {
  mealName: string | null;
  totalNutrients: CompleteScanNutritionFacts;
  detections: FoodDetection[];
}

/** @deprecated Use FoodScan. */
export type PhotoScan = FoodScan;
/** @deprecated Use FoodScanGlucoseImpact. */
export type PhotoScanGlucoseImpact = FoodScanGlucoseImpact;

export interface CorrectPhotoScanRequest {
  analysis: FoodScan;
  instruction: string;
  endUserId?: string;
  signal?: AbortSignal;
}

export interface ServingSelection {
  id: ContractFoodLogInputFood['servingId'];
  quantity: ContractFoodLogInputFood['quantity'];
}
export interface FoodSelection { id: ContractFoodLogInputFood['foodId']; serving: ServingSelection }

export interface PartnerUserContext {
  endUserId: string;
  endUserTimezone?: string;
}

/** @deprecated Use PartnerUserContext. */
export type FoodLogUserContext = PartnerUserContext;

export interface CreateFoodLogRequest extends PartnerUserContext {
  foods: FoodSelection[];
  timestampUtc?: string;
  name?: string;
  signal?: AbortSignal;
}

export interface ListFoodLogsRequest extends PartnerUserContext {
  start: string;
  end: string;
  signal?: AbortSignal;
}

export interface UpdateFoodLogRequest extends PartnerUserContext {
  logId: string;
  foods?: FoodSelection[];
  timestampUtc?: string;
  name?: string;
  signal?: AbortSignal;
}

export interface GetFoodLogRequest extends PartnerUserContext { logId: string; signal?: AbortSignal }
export interface DeleteFoodLogRequest extends PartnerUserContext { logId: string; signal?: AbortSignal }
export interface ConsumedServing { id: string | null; quantity: number | null }
export interface ServingDetails { id: string | null; quantity: number | null; unit: string | null; weightGrams?: number | null }
export interface LoggedFood {
  id: string | null;
  name: string | null;
  brandName?: string | null;
  imageUrl?: string | null;
  glycemicIndex?: number | null;
  glycemicLoad?: number | null;
  nutrients: NutritionFacts;
  consumedServing: ConsumedServing;
  servingDetails: ServingDetails;
}
export interface FoodLog { id: string | null; foods: LoggedFood[]; timestampUtc: string; name?: string | null }
export interface ListFoodLogsResponse { totalCount: number; items: FoodLog[] }
export type DeleteFoodLogResponse = void;

export const Sex = { male: 'male', female: 'female' } as const;
export type Sex = typeof Sex[keyof typeof Sex];
export const Gender = Sex;
export type Gender = Sex;
export const HeightUnit = { inches: 'in', centimeters: 'cm' } as const;
export type HeightUnit = typeof HeightUnit[keyof typeof HeightUnit];
export interface Height { value: number; unit: HeightUnit }
export const WeightUnit = { pounds: 'lb', kilograms: 'kg' } as const;
export type WeightUnit = typeof WeightUnit[keyof typeof WeightUnit];
export interface Weight { value: number; unit: WeightUnit }
export const ActivityLevel = {
  sedentary: 'sedentary', lightlyActive: 'lightly_active', moderatelyActive: 'moderately_active', veryActive: 'very_active',
} as const;
export type ActivityLevel = typeof ActivityLevel[keyof typeof ActivityLevel];
export const MedicalCondition = {
  type2Diabetes: 'type_2_diabetes', prediabetes: 'prediabetes',
} as const;
export type MedicalCondition = typeof MedicalCondition[keyof typeof MedicalCondition];

export interface GlucosePredictionProfile {
  age: number;
  sex: Sex;
  height: Height;
  weight: Weight;
  activityLevel?: ActivityLevel;
  healthConditions?: MedicalCondition[];
}
export interface CgmReading { timestamp: string; value: number }
export interface ConsumedHistoricalServing { id: string; quantity: number }
export interface ConsumedHistoricalFood { timestamp: string; id: string; serving: ConsumedHistoricalServing }
export interface PredictGlucoseRequest {
  userProfile: GlucosePredictionProfile;
  foods: FoodSelection[];
  startTime: Date;
  cgmData?: CgmReading[];
  consumedFoods?: ConsumedHistoricalFood[];
  endUserId?: string;
  endUserTimezone?: string;
  signal?: AbortSignal;
}
export interface GlucoseChart { min: number | null; max: number | null }
export interface GlucosePrediction {
  prediction: GlucosePredictionPoint[];
  impact: string | null;
  chart: GlucoseChart;
}
import type { FoodLogInputFood as ContractFoodLogInputFood } from './internal/transport/models/FoodLogInputFood.js';
import type { FoodSearchItem as ContractFoodSearchItem } from './internal/transport/models/FoodSearchItem.js';
import type { FoodSuggestion as ContractFoodSuggestion } from './internal/transport/models/FoodSuggestion.js';
import type { Restaurant as ContractRestaurant } from './internal/transport/models/Restaurant.js';
import type { RestaurantMenuSearchItem as ContractRestaurantMenuItem } from './internal/transport/models/RestaurantMenuSearchItem.js';
import type { ServingOption as ContractServingOption } from './internal/transport/models/ServingOption.js';
