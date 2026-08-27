import { useMutation } from '@tanstack/react-query'
import { getFoodDetails } from '~/api/january.functions'
import { useUserSession } from './user-session'

export function useHydratedFood() {
  const session = useUserSession()

  return useMutation({
    mutationFn: (food: { id: number }) => getFoodDetails({
      data: {
        foodId: food.id,
        ...(session.endUserId ? { endUserId: session.endUserId } : {}),
      },
    }),
  })
}
