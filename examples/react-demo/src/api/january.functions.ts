import {
  ActivityLevel,
  AutocompleteFoodCategory,
  DietPreference,
  DietRestriction,
  FoodCategory,
  HeightUnit,
  JanuaryError,
  MedicalCondition,
  Sex,
  VolumeUnit,
  WeightUnit,
  type FoodScan,
  type FoodSelection,
  type FoodLog,
  type GetFoodRequest,
  type GetRestaurantMenuItemsRequest,
} from '@januaryai/web-sdk'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  getDemoConfigurationDetails,
  getJanuaryClient,
  mintFreshDemoClientToken,
} from './january.server'

const optionalUserId = z.string().trim().max(256).optional()
const foodIdSchema: z.ZodType<GetFoodRequest['foodId']> = z.string().trim().min(1).max(256)
const servingIdSchema: z.ZodType<FoodSelection['serving']['id']> = z.string().trim().min(1).max(256)
const restaurantIdSchema: z.ZodType<GetRestaurantMenuItemsRequest['restaurantId']> = z.string().regex(/^[A-Za-z0-9_-]{1,256}$/)
const foodLogIdSchema: z.ZodType<NonNullable<FoodLog['id']>> = z.string().trim().min(1).max(256)

export const getDemoConfiguration = createServerFn({ method: 'GET' })
  .handler(() => getDemoConfigurationDetails())

export const refreshDemoClientToken = createServerFn({ method: 'POST' })
  .validator(z.object({ endUserId: optionalUserId }))
  .handler(async ({ data }) => {
    await mintFreshDemoClientToken(data.endUserId)
    return getDemoConfigurationDetails()
  })

const foodSearchSchema = z.object({
  query: z.string().trim().min(1).max(256),
  category: z.enum([FoodCategory.general, FoodCategory.branded, FoodCategory.recipe]).optional(),
  endUserId: optionalUserId,
})

export const searchFoods = createServerFn({ method: 'GET' })
  .validator(foodSearchSchema)
  .handler(({ data }) => getJanuaryClient(data.endUserId).foods.search({ ...data, limit: 20 }))

export const autocompleteFoods = createServerFn({ method: 'GET' })
  .validator(z.object({
    query: z.string().trim().min(2).max(64),
    category: z.enum([AutocompleteFoodCategory.general, AutocompleteFoodCategory.branded]).optional(),
    limit: z.number().int().min(1).max(20).default(8),
    endUserId: optionalUserId,
  }))
  .handler(({ data }) => getJanuaryClient(data.endUserId).foods.autocomplete(data))

export const getFoodDetails = createServerFn({ method: 'GET' })
  .validator(z.object({
    foodId: foodIdSchema,
    endUserId: optionalUserId,
  }))
  .handler(({ data }) => getJanuaryClient(data.endUserId).foods.get(data))

export const searchFoodCatalog = createServerFn({ method: 'GET' })
  .validator(z.object({
    query: z.string().trim().min(1).max(256),
    mode: z.enum(['name', 'barcode']),
    category: z.enum([FoodCategory.general, FoodCategory.branded, FoodCategory.recipe]).optional(),
    endUserId: optionalUserId,
  }))
  .handler(async ({ data }) => {
    const client = getJanuaryClient(data.endUserId)
    if (data.mode === 'barcode') {
      try {
        return await client.foods.lookupBarcode({ upc: data.query, endUserId: data.endUserId })
      } catch (error) {
        // An unknown UPC is a 404: show it as "no match" rather than as a failed request.
        if (error instanceof JanuaryError && error.status === 404) return { totalCount: 0, items: [] }
        throw error
      }
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
  .handler(({ data }) => getJanuaryClient(data.endUserId).restaurants.search({ ...data, radius: 8_000, limit: 20 }))

export const searchRestaurantMenuItems = createServerFn({ method: 'GET' })
  .validator(restaurantSearchSchema)
  .handler(({ data }) => getJanuaryClient(data.endUserId).restaurants.searchMenuItems({ ...data, radius: 8_000, limit: 20 }))

export const analyzeFoodPhoto = createServerFn({ method: 'POST' })
  .validator(z.object({ image: z.string().min(1), endUserId: optionalUserId }))
  .handler(({ data }) => getJanuaryClient(data.endUserId).foodAnalysis.analyzePhoto(data))

export const analyzeFoodDescription = createServerFn({ method: 'POST' })
  .validator(z.object({ description: z.string().trim().min(1).max(512), endUserId: optionalUserId }))
  .handler(({ data }) => getJanuaryClient(data.endUserId).foodAnalysis.analyzeDescription({
    query: data.description,
    ...(data.endUserId ? { endUserId: data.endUserId } : {}),
  }))

// The scan goes back exactly as the SDK returned it; the SDK forwards it field for field.
const foodScanSchema = z.custom<FoodScan>((value) => typeof value === 'object'
  && value !== null
  && Array.isArray((value as { detections?: unknown }).detections), 'Send the scan exactly as it was returned.')

export const correctFoodScan = createServerFn({ method: 'POST' })
  .validator(z.object({
    analysis: foodScanSchema,
    instruction: z.string().trim().min(1).max(1_000),
    endUserId: optionalUserId,
  }))
  .handler(({ data }) => getJanuaryClient(data.endUserId).foodAnalysis.correct({
    analysis: data.analysis,
    instruction: data.instruction,
    ...(data.endUserId ? { endUserId: data.endUserId } : {}),
  }))

export const suggestFoodAlternatives = createServerFn({ method: 'POST' })
  .validator(z.object({
    foodId: foodIdSchema,
    dietRestrictions: z.array(z.enum(Object.values(DietRestriction) as [DietRestriction, ...DietRestriction[]])),
    dietPreferences: z.array(z.enum(Object.values(DietPreference) as [DietPreference, ...DietPreference[]])),
    endUserId: optionalUserId,
  }))
  .handler(({ data }) => getJanuaryClient(data.endUserId).foods.suggestAlternatives({
    foodId: data.foodId,
    dietRestrictions: data.dietRestrictions,
    dietPreferences: data.dietPreferences,
    ...(data.endUserId ? { endUserId: data.endUserId } : {}),
  }))

export const getFoodLogSummary = createServerFn({ method: 'GET' })
  .validator(z.object({
    start: z.iso.date(),
    end: z.iso.date(),
    endUserId: z.string().trim().min(1).max(256),
    endUserTimezone: z.string().trim().min(1).max(100),
  }))
  .handler(({ data }) => {
    const { endUserId, endUserTimezone, ...request } = data
    return getJanuaryClient(data.endUserId).forUser({ endUserId, endUserTimezone }).foodLogs.getSummary({ ...request, groupBy: 'day' })
  })

export const listFoodLogs = createServerFn({ method: 'GET' })
  .validator(z.object({
    start: z.iso.date(),
    end: z.iso.date(),
    endUserId: z.string().trim().min(1).max(256),
    endUserTimezone: z.string().trim().min(1).max(100),
  }))
  .handler(({ data }) => {
    const { endUserId, endUserTimezone, ...request } = data
    return getJanuaryClient(data.endUserId).forUser({ endUserId, endUserTimezone }).foodLogs.list(request)
  })

// `serving.quantity` is a number of servings; the API accepts up to 10,000.
const foodSelectionSchema = z.object({
  id: foodIdSchema,
  serving: z.object({ id: servingIdSchema, quantity: z.number().positive().max(10_000) }),
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
    const foodLogs = getJanuaryClient(data.endUserId).forUser({ endUserId, endUserTimezone }).foodLogs
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
    return getJanuaryClient(data.endUserId).forUser({ endUserId, endUserTimezone }).foodLogs.delete({ logId })
  })

const userContextSchema = {
  endUserId: z.string().trim().min(1).max(256),
  endUserTimezone: z.string().trim().min(1).max(100),
}
const dateRangeSchema = { start: z.iso.date(), end: z.iso.date() }
const volumeUnitSchema = z.enum([VolumeUnit.fluidOunces, VolumeUnit.milliliters, VolumeUnit.cups])
const weightUnitSchema = z.enum([WeightUnit.pounds, WeightUnit.kilograms])

export const createWaterLog = createServerFn({ method: 'POST' })
  .validator(z.object({
    value: z.number().positive().max(24_000),
    unit: volumeUnitSchema,
    consumedAt: z.iso.datetime().optional(),
    ...userContextSchema,
  }))
  .handler(({ data }) => {
    const { endUserId, endUserTimezone, value, unit, consumedAt } = data
    return getJanuaryClient(data.endUserId).forUser({ endUserId, endUserTimezone }).waterLogs.create({
      amount: { value, unit },
      ...(consumedAt ? { consumedAt } : {}),
    })
  })

export const listWaterLogs = createServerFn({ method: 'GET' })
  .validator(z.object({ ...dateRangeSchema, unit: volumeUnitSchema, ...userContextSchema }))
  .handler(({ data }) => {
    const { endUserId, endUserTimezone, ...request } = data
    return getJanuaryClient(data.endUserId).forUser({ endUserId, endUserTimezone }).waterLogs.list(request)
  })

export const deleteWaterLog = createServerFn({ method: 'POST' })
  .validator(z.object({ logId: z.string().trim().min(1).max(256), ...userContextSchema }))
  .handler(({ data }) => {
    const { endUserId, endUserTimezone, logId } = data
    return getJanuaryClient(data.endUserId).forUser({ endUserId, endUserTimezone }).waterLogs.delete({ logId })
  })

export const createWeightLog = createServerFn({ method: 'POST' })
  .validator(z.object({
    value: z.number().positive().max(1_000),
    unit: weightUnitSchema,
    measuredAt: z.iso.datetime().optional(),
    ...userContextSchema,
  }))
  .handler(({ data }) => {
    const { endUserId, endUserTimezone, value, unit, measuredAt } = data
    return getJanuaryClient(data.endUserId).forUser({ endUserId, endUserTimezone }).weightLogs.create({
      weight: { value, unit },
      ...(measuredAt ? { measuredAt } : {}),
    })
  })

export const listWeightLogs = createServerFn({ method: 'GET' })
  .validator(z.object({ ...dateRangeSchema, ...userContextSchema }))
  .handler(({ data }) => {
    const { endUserId, endUserTimezone, ...request } = data
    return getJanuaryClient(data.endUserId).forUser({ endUserId, endUserTimezone }).weightLogs.list(request)
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
    // A number of servings, which can pass 100 when a serving is under one unit ("0.5 cup").
    quantity: z.number().positive().max(10_000),
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
    const client = getJanuaryClient(data.endUserId)
    return data.endUserId
      ? client.forUser({ endUserId: data.endUserId, endUserTimezone: data.endUserTimezone }).glucose.predict(request)
      : client.glucose.predict({ ...request, endUserTimezone: data.endUserTimezone })
  })

export const predictMealGlucose = createServerFn({ method: 'POST' })
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
    foods: z.array(z.object({
      foodId: foodIdSchema,
      servingId: servingIdSchema,
      quantity: z.number().positive().max(100),
    })).min(1).max(100),
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
      foods: data.foods.map((food) => ({
        id: food.foodId,
        serving: { id: food.servingId, quantity: food.quantity },
      })),
      startTime: new Date(data.startTime),
    }
    const client = getJanuaryClient(data.endUserId)
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
    const client = getJanuaryClient(data.endUserId)
    try {
      const items: import('@januaryai/web-sdk').RestaurantMenuItem[] = []
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
