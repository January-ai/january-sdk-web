export const FoodCategory = {
  general: 'general',
  branded: 'branded',
  recipe: 'recipe',
} as const;

export type FoodCategory = typeof FoodCategory[keyof typeof FoodCategory];

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
  id: number;
  name: string;
  brandName: string | null;
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
  glycemicIndex: number | null;
  glycemicLoad: number | null;
  photoUrl: string | null;
  servings: ServingOption[];
}

export interface ServingOption {
  id: number;
  quantity: number;
  unit: string;
  scalingFactor: number;
  weightGrams: number | null;
  isPrimary: boolean;
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
  id: number;
  quantity?: number;
  unit: string;
  selectedQuantity?: number;
}

export interface NaturalLanguageFood {
  id?: number;
  name: string;
  brandName?: string;
  nutrients: CompleteScanNutritionFacts;
  servings?: NaturalLanguageServing[];
}

export interface NaturalLanguageFoodDetection {
  food: NaturalLanguageFood;
}

export interface SearchFoodsByNaturalLanguageResponse {
  totalNutrients?: CompleteScanNutritionFacts;
  detections: NaturalLanguageFoodDetection[];
}

export const DietRestriction = {
  none: 'None', gluten: 'Gluten', lactose: 'Lactose', yeast: 'Yeast', treeNuts: 'Tree nuts',
  peanuts: 'Peanuts', dairy: 'Dairy', eggs: 'Eggs', sulfites: 'Sulfites', soy: 'Soy', wheat: 'Wheat',
  shellfish: 'Shellfish', fish: 'Fish', mushrooms: 'Mushrooms', sesame: 'Sesame',
  monosodiumGlutamateMsg: 'Monosodium glutamate (MSG)', caffeine: 'Caffeine', fodmaps: 'FODMAPs',
} as const;
export type DietRestriction = typeof DietRestriction[keyof typeof DietRestriction];

export const DietPreference = {
  none: 'None', vegetarian: 'Vegetarian', vegan: 'Vegan', keto: 'Keto', paleo: 'Paleo',
  pescatarian: 'Pescatarian', lowCarbohydrate: 'Low carbohydrate', highProtein: 'High protein',
  kosher: 'Kosher', halal: 'Halal',
} as const;
export type DietPreference = typeof DietPreference[keyof typeof DietPreference];

export interface SuggestFoodAlternativesRequest {
  foodId: number;
  dietRestrictions: DietRestriction[];
  dietPreferences: DietPreference[];
  endUserId?: string;
  signal?: AbortSignal;
}

export interface DetectedServing {
  id: number;
  quantity?: number;
  unit: string;
}

export interface DetectedFood {
  id?: number;
  name: string;
  brandName?: string;
  nutrients: CompleteScanNutritionFacts;
  servings?: DetectedServing[];
}

export interface FoodAlternative { food: DetectedFood }
export interface SuggestFoodAlternativesResponse { alternatives: FoodAlternative[] }

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
  id: string;
  name: string;
  isChain?: boolean;
  distance?: number;
  city?: string;
  address1?: string;
  address2?: string;
}

export interface SearchRestaurantsResponse { totalCount: number; items: Restaurant[] }

export interface RestaurantMenuItem {
  type: string;
  id: string;
  name: string;
  restaurantName: string;
  isChain?: boolean;
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
  distance?: number;
  servings: ServingOption[];
}

export interface SearchRestaurantMenuItemsResponse { totalCount: number; items: RestaurantMenuItem[] }

export interface ScanFoodPhotoRequest {
  image: string;
  endUserId?: string;
  signal?: AbortSignal;
}

export interface FoodDetection { confidenceScore?: string; food: DetectedFood }
export interface GlucosePredictionPoint { minutes: number; value: number }
export interface PhotoScanGlucoseImpact { impactScore: string; prediction: GlucosePredictionPoint[] }
export interface PhotoScan {
  mealName?: string;
  totalNutrients?: CompleteScanNutritionFacts;
  detections?: FoodDetection[];
  glucoseImpact?: PhotoScanGlucoseImpact;
}

export interface CorrectPhotoScanRequest {
  mealName: string;
  detections: FoodDetection[];
  userInput: string;
  endUserId?: string;
  signal?: AbortSignal;
}

export interface ServingSelection { id: number; quantity: number }
export interface FoodSelection { id: number; serving: ServingSelection }

export interface FoodLogUserContext {
  endUserId: string;
  endUserTimezone?: string;
}

export interface CreateFoodLogRequest extends FoodLogUserContext {
  foods: FoodSelection[];
  timestampUtc?: string;
  name?: string;
  signal?: AbortSignal;
}

export interface ListFoodLogsRequest extends FoodLogUserContext {
  start: string;
  end: string;
  signal?: AbortSignal;
}

export interface UpdateFoodLogRequest extends FoodLogUserContext {
  logId: string;
  foods?: FoodSelection[];
  timestampUtc?: string;
  name?: string;
  signal?: AbortSignal;
}

export interface DeleteFoodLogRequest extends FoodLogUserContext { logId: string; signal?: AbortSignal }
export interface ConsumedServing { id: number; quantity: number }
export interface ServingDetails { id: number; quantity: number; unit: string; weightGrams?: number | null }
export interface LoggedFood {
  id: number;
  name: string;
  brandName?: string | null;
  imageUrl?: string | null;
  glycemicIndex?: number | null;
  glycemicLoad?: number | null;
  nutrients: NutritionFacts;
  consumedServing: ConsumedServing;
  servingDetails: ServingDetails;
}
export interface FoodLog { id: string; foods: LoggedFood[]; timestampUtc: string; name?: string | null }
export interface ListFoodLogsResponse { totalCount: number; items: FoodLog[] }
export interface DeleteFoodLogResponse { status: string }

export const Gender = { male: 'male', female: 'female' } as const;
export type Gender = typeof Gender[keyof typeof Gender];
export const ActivityLevel = {
  sedentary: 'sedentary', lightlyActive: 'lightly_active', moderatelyActive: 'moderately_active', veryActive: 'very_active',
} as const;
export type ActivityLevel = typeof ActivityLevel[keyof typeof ActivityLevel];
export const MedicalCondition = {
  type2Diabetes: 'Type 2 diabetes', prediabetes: 'Prediabetes', noneOfTheAbove: 'None of the above',
} as const;
export type MedicalCondition = typeof MedicalCondition[keyof typeof MedicalCondition];

export interface GlucosePredictionProfile {
  age: number;
  gender: Gender;
  height: number;
  weight: number;
  activityLevel?: ActivityLevel;
  healthConditions?: MedicalCondition[];
}
export interface CgmReading { timestamp: string; value: number }
export interface ConsumedHistoricalServing { id: number; quantity: number }
export interface ConsumedHistoricalFood { timestamp: string; id: number; serving: ConsumedHistoricalServing }
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
export interface GlucosePrediction { cgp: number[][]; scoring: string; cgpMin: number; cgpMax: number }
