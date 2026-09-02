import type { FoodSuggestion } from '@januaryai/sdk'
import { useQuery } from '@tanstack/react-query'
import { LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { autocompleteFoods } from '~/api/january.functions'
import { Card } from './ui'

export function useFoodAutocomplete(query: string, endUserId?: string, suppressedQuery?: string | null) {
  const normalizedQuery = query.trim()
  const [debouncedQuery, setDebouncedQuery] = useState(normalizedQuery)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(normalizedQuery), 300)
    return () => window.clearTimeout(timer)
  }, [normalizedQuery])

  const result = useQuery({
    queryKey: ['food-autocomplete', debouncedQuery, endUserId],
    queryFn: () => autocompleteFoods({ data: {
      query: debouncedQuery,
      limit: 8,
      ...(endUserId ? { endUserId } : {}),
    } }),
    enabled: debouncedQuery.length >= 2
      && debouncedQuery.length <= 64
      && debouncedQuery !== suppressedQuery,
  })

  return {
    ...result,
    items: normalizedQuery === debouncedQuery && normalizedQuery !== suppressedQuery
      ? result.data?.items ?? []
      : [],
  }
}

export function FoodSuggestionList({
  items,
  busyFoodId,
  onSelect,
}: {
  items: FoodSuggestion[]
  busyFoodId?: string
  onSelect(suggestion: FoodSuggestion): void
}) {
  if (!items.length) return null

  return (
    <Card aria-label="Food suggestions" className="overflow-hidden">
      {items.map((suggestion) => {
        const busy = busyFoodId === suggestion.id
        return (
          <button
            className="flex min-h-14 w-full items-center gap-3 border-b border-stone-100 px-4 py-3 text-left last:border-b-0 hover:bg-stone-50 disabled:cursor-wait disabled:opacity-70"
            disabled={busyFoodId !== undefined}
            key={suggestion.id}
            onClick={() => onSelect(suggestion)}
            type="button"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-stone-950">{suggestion.name}</span>
              {suggestion.brandName && <span className="mt-0.5 block truncate text-xs text-stone-500">{suggestion.brandName}</span>}
            </span>
            {busy && <LoaderCircle aria-hidden="true" className="size-4 shrink-0 animate-spin text-stone-500 motion-reduce:animate-none" />}
          </button>
        )
      })}
    </Card>
  )
}
