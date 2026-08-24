import {
  ActivityLevel,
  FoodCategory,
  HeightUnit,
  MedicalCondition,
  Sex,
  WeightUnit,
} from '@januaryai/partner-sdk'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getDefaultEndUserId, getJanuaryClient, hasJanuaryConfiguration } from './january.server'

const optionalUserId = z.string().trim().max(256).optional()

export const getDemoConfiguration = createServerFn({ method: 'GET' }).handler(() => ({
  configured: hasJanuaryConfiguration(),
  defaultEndUserId: getDefaultEndUserId(),
}))

const foodSearchSchema = z.object({
  query: z.string().trim().min(1).max(256),
  category: z.enum([FoodCategory.general, FoodCategory.branded, FoodCategory.recipe]).optional(),
  endUserId: optionalUserId,
})

export const searchFoods = createServerFn({ method: 'GET' })
  .validator(foodSearchSchema)
  .handler(({ data }) => getJanuaryClient().foods.search({ ...data, limit: 20 }))

export const getFoodDetails = createServerFn({ method: 'GET' })
  .validator(z.object({
    foodId: z.number().int().positive(),
    query: z.string().trim().min(1).max(256),
    endUserId: optionalUserId,
  }))
  .handler(async ({ data }) => {
    // Partner API v1.2 returns complete food records from search; it does not
    // expose a separate GET /foods/:id operation. Re-query and select by ID so
    // the detail URL remains reloadable without inventing an endpoint.
    const response = await getJanuaryClient().foods.search({
      query: data.query,
      limit: 40,
      ...(data.endUserId ? { endUserId: data.endUserId } : {}),
    })
    const food = response.items.find((item) => item.id === data.foodId)
    if (!food) throw new Error('This food is no longer available in the search results.')
    return food
  })

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
      const response = await client.foods.searchNaturalLanguage({ query: data.query, endUserId: data.endUserId })
      const items = (response.detections ?? []).map((detection, index) => ({
        id: detection.food.id ?? -(index + 1),
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

export const scanMeal = createServerFn({ method: 'POST' })
  .validator(z.object({ image: z.string().min(1), endUserId: optionalUserId }))
  .handler(({ data }) => getJanuaryClient().photoScanning.scan(data))

export const listFoodLogs = createServerFn({ method: 'GET' })
  .validator(z.object({
    start: z.iso.date(),
    end: z.iso.date(),
    endUserId: z.string().trim().min(1).max(256),
    endUserTimezone: z.string().trim().min(1).max(100),
  }))
  .handler(({ data }) => getJanuaryClient().foodLogs.list(data))

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
    foodId: z.number().int().positive(),
    servingId: z.number().int().positive(),
    quantity: z.number().positive().max(100),
    startTime: z.iso.datetime(),
    endUserId: optionalUserId,
    endUserTimezone: z.string().trim().min(1).max(100),
  }))
  .handler(({ data }) => getJanuaryClient().glucose.predict({
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
    endUserTimezone: data.endUserTimezone,
    ...(data.endUserId ? { endUserId: data.endUserId } : {}),
  }))
