import type { Restaurant, SearchRestaurantMenuItemsResponse } from '@januaryai/sdk'
import type { UseQueryResult } from '@tanstack/react-query'
import { MapPin, Utensils } from 'lucide-react'
import { formatNumber } from '~/lib/utils'
import { NetworkImage } from '../network-image'
import { Card, EmptyState, ErrorMessage, ResultRow, SectionLabel, SkeletonList } from '../ui'

export function RestaurantInspector({ restaurant, menuItems }: { restaurant: Restaurant | null; menuItems: UseQueryResult<SearchRestaurantMenuItemsResponse, Error> }) {
  if (!restaurant) return <EmptyState description="Select a restaurant to load matching menu items." icon={<MapPin aria-hidden="true" className="size-6" />} title="Choose a restaurant" />
  return <div className="space-y-4"><Card className="p-6"><SectionLabel>Restaurant</SectionLabel><h3 className="mt-3 text-balance font-serif text-3xl">{restaurant.name}</h3><p className="mt-3 text-pretty text-sm leading-6 text-stone-600">{[restaurant.address1, restaurant.city].filter(Boolean).join(', ') || 'Location details unavailable'}</p></Card>{menuItems.isPending ? <SkeletonList /> : menuItems.isError ? <ErrorMessage error={menuItems.error} /> : menuItems.data ? <Card className="overflow-hidden">{menuItems.data.items.length ? menuItems.data.items.map((item) => <ResultRow key={item.id} media={<NetworkImage alt="" className="size-full" fallback={<Utensils aria-hidden="true" className="size-6 text-stone-600" />} src={item.photoUrl} />} meta={`${formatNumber(item.energy, 0)} cal · ${item.servings[0] ? `${item.servings[0].quantity} ${item.servings[0].unit}` : 'Serving unavailable'}`} title={item.name} />) : <div className="p-6 text-pretty text-sm text-stone-600">No matching menu items were returned for this restaurant.</div>}</Card> : null}</div>
}
