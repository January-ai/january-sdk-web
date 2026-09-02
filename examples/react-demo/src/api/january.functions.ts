import {
  ActivityLevel,
  AutocompleteFoodCategory,
  FoodCategory,
  HeightUnit,
  JanuaryError,
  MedicalCondition,
  Sex,
  WeightUnit,
  type FoodSelection,
  type FoodLog,
  type GetFoodRequest,
  type GetRestaurantMenuItemsRequest,
} from '@januaryai/sdk'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  getDemoConfigurationDetails,
  getJanuaryClient,
  mintFreshDemoClientToken,
  revokeDemoClientTokens,
} from './january.server'

const optionalUserId = z.string().trim().max(256).optional()
const foodIdSchema: z.ZodType<GetFoodRequest['foodId']> = z.string().trim().min(1).max(256)
const servingIdSchema: z.ZodType<FoodSelection['serving']['id']> = z.string().trim().min(1).max(256)
const restaurantIdSchema: z.ZodType<GetRestaurantMenuItemsRequest['restaurantId']> = z.string().regex(/^[A-Za-z0-9_-]{1,256}$/)
const foodLogIdSchema: z.ZodType<NonNullable<FoodLog['id']>> = z.string().trim().min(1).max(256)

export const getDemoConfiguration = createServerFn({ method: 'GET' })
  .handler(() => getDemoConfigurationDetails())

export const refreshDemoClientToken = createServerFn({ method: 'POST' })
  .handler(async () => {
    await mintFreshDemoClientToken()
    return getDemoConfigurationDetails()
  })

export const revokeAllDemoClientTokens = createServerFn({ method: 'POST' })
  .handler(async () => {
    await revokeDemoClientTokens()
    return getDemoConfigurationDetails()
  })

const foodSearchSchema = z.object({
  query: z.string().trim().min(1).max(256),
  category: z.enum([FoodCategory.general, FoodCategory.branded, FoodCategory.recipe]).optional(),
  endUserId: optionalUserId,
})

export const searchFoods = createServerFn({ method: 'GET' })
  .validator(foodSearchSchema)
  .handler(({ data }) => getJanuaryClient().foods.search({ ...data, limit: 20 }))

export const autocompleteFoods = createServerFn({ method: 'GET' })
  .validator(z.object({
    query: z.string().trim().min(2).max(64),
    category: z.enum([AutocompleteFoodCategory.general, AutocompleteFoodCategory.branded]).optional(),
    limit: z.number().int().min(1).max(20).default(8),
    endUserId: optionalUserId,
  }))
  .handler(({ data }) => getJanuaryClient().foods.autocomplete(data))

export const getFoodDetails = createServerFn({ method: 'GET' })
  .validator(z.object({
    foodId: foodIdSchema,
    endUserId: optionalUserId,
  }))
  .handler(({ data }) => getJanuaryClient().foods.get(data))

export const searchFoodCatalog = createServerFn({ method: 'GET' })
  .validator(z.object({
    query: z.string().trim().min(1).max(256),
    mode: z.enum(['name', 'description', 'barcode']),
    category: z.enum([FoodCategory.general, FoodCategory.branded, FoodCategory.recipe]).optional(),
    endUserId: optionalUserId,
  }))
  .handler(async ({ data }) => {
    const client = getJanuaryClient()
    if (data.mode === 'barcode') {
      return client.foods.lookupBarcode({ upc: data.query, endUserId: data.endUserId })
    }
    if (data.mode === 'description') {
      const response = await client.foodAnalysis.analyzeDescription({ query: data.query, endUserId: data.endUserId })
      const items = (response.detections ?? []).map((detection, index) => ({
        type: FoodCategory.generic,
        id: detection.food.id ?? `detected-${index + 1}`,
        name: detection.food.name,
        brandName: detection.food.brandName ?? null,
        calories: detection.food.nutrients.calories?.value ?? null,
        protein: detection.food.nutrients.protein?.value ?? null,
        carbohydrates: detection.food.nutrients.carbohydrates?.value ?? null,
        netCarbohydrates: detection.food.nutrients.netCarbohydrates?.value ?? null,
        totalFat: detection.food.nutrients.totalFat?.value ?? null,
        saturatedFat: detection.food.nutrients.saturatedFat?.value ?? null,
        fiber: detection.food.nutrients.fiber?.value ?? null,
        totalSugars: detection.food.nutrients.totalSugars?.value ?? null,
        addedSugars: detection.food.nutrients.addedSugars?.value ?? null,
        sodium: detection.food.nutrients.sodium?.value ?? null,
        potassium: null,
        cholesterol: null,
        glycemicIndex: null,
        glycemicLoad: null,
        photoUrl: null,
        barcode: null,
        nutrients: null,
        servings: (detection.food.servings ?? []).map((serving) => ({
          id: serving.id,
          quantity: serving.quantity ?? 1,
          unit: serving.unit,
          scalingFactor: 1,
          weightGrams: null,
          isPrimary: false,
        })),
      }))
      return { totalCount: items.length, items }
    }
    return client.foods.search({
      query: data.query,
      category: data.category,
      endUserId: data.endUserId,
      limit: 20,
    })
  })

const restaurantSearchSchema = z.object({
  query: z.string().trim().min(1).max(256),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  endUserId: optionalUserId,
})

export const searchRestaurants = createServerFn({ method: 'GET' })
  .validator(restaurantSearchSchema)
  .handler(({ data }) => getJanuaryClient().restaurants.search({ ...data, radius: 8_000, limit: 20 }))

export const searchRestaurantMenuItems = createServerFn({ method: 'GET' })
  .validator(restaurantSearchSchema)
  .handler(({ data }) => getJanuaryClient().restaurants.searchMenuItems({ ...data, radius: 8_000, limit: 20 }))

export const analyzeFoodPhoto = createServerFn({ method: 'POST' })
  .validator(z.object({ image: z.string().min(1), endUserId: optionalUserId }))
  .handler(({ data }) => getJanuaryClient().foodAnalysis.analyzePhoto(data))

export const listFoodLogs = createServerFn({ method: 'GET' })
  .validator(z.object({
    start: z.iso.date(),
    end: z.iso.date(),
    endUserId: z.string().trim().min(1).max(256),
    endUserTimezone: z.string().trim().min(1).max(100),
  }))
  .handler(({ data }) => {
    const { endUserId, endUserTimezone, ...request } = data
    return getJanuaryClient().forUser({ endUserId, endUserTimezone }).foodLogs.list(request)
  })

const foodSelectionSchema = z.object({
  id: foodIdSchema,
  serving: z.object({ id: servingIdSchema, quantity: z.number().positive().max(100) }),
})

export const saveFoodLog = createServerFn({ method: 'POST' })
  .validator(z.object({
    logId: foodLogIdSchema.optional(),
    foods: z.array(foodSelectionSchema).min(1),
    timestampUtc: z.iso.datetime(),
    name: z.string().trim().max(120).optional(),
    endUserId: z.string().trim().min(1).max(256),
    endUserTimezone: z.string().trim().min(1).max(100),
  }))
  .handler(({ data }) => {
    const { endUserId, endUserTimezone, logId, ...request } = data
    const foodLogs = getJanuaryClient().forUser({ endUserId, endUserTimezone }).foodLogs
    return logId ? foodLogs.update({ ...request, logId }) : foodLogs.create(request)
  })

export const deleteFoodLog = createServerFn({ method: 'POST' })
  .validator(z.object({
    logId: foodLogIdSchema,
    endUserId: z.string().trim().min(1).max(256),
    endUserTimezone: z.string().trim().min(1).max(100),
  }))
  .handler(({ data }) => {
    const { endUserId, endUserTimezone, logId } = data
    return getJanuaryClient().forUser({ endUserId, endUserTimezone }).foodLogs.delete({ logId })
  })

export const predictGlucose = createServerFn({ method: 'POST' })
  .validator(z.object({
    age: z.number().int().min(18).max(120),
    sex: z.enum([Sex.female, Sex.male]),
    height: z.number().min(36).max(96),
    weight: z.number().min(60).max(700),
    activityLevel: z.enum([
      ActivityLevel.sedentary,
      ActivityLevel.lightlyActive,
      ActivityLevel.moderatelyActive,
      ActivityLevel.veryActive,
    ]),
    healthConditions: z.array(z.enum([MedicalCondition.type2Diabetes, MedicalCondition.prediabetes])),
    foodId: foodIdSchema,
    servingId: servingIdSchema,
    quantity: z.number().positive().max(100),
    startTime: z.iso.datetime(),
    endUserId: optionalUserId,
    endUserTimezone: z.string().trim().min(1).max(100),
  }))
  .handler(({ data }) => {
    const request = {
      userProfile: {
        age: data.age,
        sex: data.sex,
        height: { value: data.height, unit: HeightUnit.inches },
        weight: { value: data.weight, unit: WeightUnit.pounds },
        activityLevel: data.activityLevel,
        healthConditions: data.healthConditions,
      },
      foods: [{ id: data.foodId, serving: { id: data.servingId, quantity: data.quantity } }],
      startTime: new Date(data.startTime),
    }
    const client = getJanuaryClient()
    return data.endUserId
      ? client.forUser({ endUserId: data.endUserId, endUserTimezone: data.endUserTimezone }).glucose.predict(request)
      : client.glucose.predict({ ...request, endUserTimezone: data.endUserTimezone })
  })

export const getRestaurantMenuItems = createServerFn({ method: 'GET' })
  .validator(z.object({
    restaurantId: restaurantIdSchema,
    restaurantName: z.string().trim().min(1).max(256),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    endUserId: optionalUserId,
  }))
  .handler(async ({ data }) => {
    const client = getJanuaryClient()
    try {
      const items: import('@januaryai/sdk').RestaurantMenuItem[] = []
      while (true) {
        const page = await client.restaurants.getMenuItems({
          restaurantId: data.restaurantId,
          endUserId: data.endUserId,
          limit: 100,
          offset: items.length,
        })
        items.push(...page.items.flatMap((item) => item.id ? [{
          ...item,
          id: item.id,
          type: 'menu_item' as const,
          restaurantName: data.restaurantName,
        }] : []))
        if (page.items.length < 100) return { totalCount: items.length, items }
      }
    } catch (error) {
      const menuIsUnavailable = error instanceof JanuaryError && error.status === 404
      if (!menuIsUnavailable) throw error
      const page = await client.restaurants.searchMenuItems({
        query: data.restaurantName,
        latitude: data.latitude,
        longitude: data.longitude,
        radius: 8_000,
        limit: 20,
        endUserId: data.endUserId,
      })
      const normalize = (value: string) => value
        .split('(', 1)[0]!
        .toLocaleLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
      const items = page.items.filter((item) => item.restaurantName && normalize(item.restaurantName) === normalize(data.restaurantName))
      return { totalCount: items.length, items }
    }
  })
