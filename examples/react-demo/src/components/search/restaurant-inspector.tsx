import type { Restaurant, SearchRestaurantMenuItemsResponse } from '@januaryai/web-sdk'
import type { UseQueryResult } from '@tanstack/react-query'
import { useState } from 'react'
import { MapPin, Utensils } from 'lucide-react'
import { formatNumber } from '~/lib/utils'
import { NetworkImage } from '../network-image'
import { Button, SecondaryButton, Card, EmptyState, ErrorMessage, ResultRow, SectionLabel, SkeletonList } from '../ui'

export function RestaurantInspector({ restaurant, menuItems, query, onSearch }: {
  restaurant: Restaurant | null
  menuItems: UseQueryResult<SearchRestaurantMenuItemsResponse, Error>
  query: string
  onSearch: (query: string) => void
}) {
  const [draft, setDraft] = useState(query)
  if (!restaurant) return <EmptyState description="Select a restaurant to browse or search its menu." icon={<MapPin aria-hidden="true" className="size-6" />} title="Choose a restaurant" />
  return <div className="space-y-4" data-testid="restaurant-detail-screen">
    <Card className="p-6">
      <SectionLabel>Restaurant</SectionLabel>
      <h3 className="mt-3 text-balance font-serif text-3xl">{restaurant.name ?? 'Unnamed restaurant'}</h3>
      <p className="mt-3 text-pretty text-sm leading-6 text-stone-600">{[restaurant.address1, restaurant.city].filter(Boolean).join(', ') || 'Location details unavailable'}</p>
      <form className="mt-6 space-y-3" onSubmit={(event) => { event.preventDefault(); onSearch(draft.trim()) }}>
        <label className="block text-sm font-medium text-stone-800" htmlFor="restaurant-menu-search">Search this menu</label>
        <input className="min-h-11 w-full rounded-xl border border-stone-400 bg-white px-4 text-base text-stone-900 outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2" id="restaurant-menu-search" maxLength={256} onChange={(event) => setDraft(event.target.value)} placeholder="Dish name, e.g. burger" type="search" value={draft} />
        <div className="flex flex-wrap gap-3">
          <Button type="submit">Search menu</Button>
          {(query || draft) && <SecondaryButton onClick={() => { setDraft(''); onSearch('') }} type="button">Show full menu</SecondaryButton>}
        </div>
      </form>
    </Card>
    <div aria-live="polite" aria-busy={menuItems.isFetching}>
      {menuItems.isPending ? <SkeletonList testId="menu-loading" />
        : menuItems.isError ? <ErrorMessage error={menuItems.error} onRetry={() => void menuItems.refetch()} retryTestId="menu-error-retry" testId="menu-error" />
        : menuItems.data ? <Card className="overflow-hidden" data-testid="menu-results">
          {menuItems.data.items.length ? menuItems.data.items.map((item, index) => <ResultRow key={item.id} media={<NetworkImage alt="" className="size-full" fallback={<Utensils aria-hidden="true" className="size-6 text-stone-600" />} src={item.photoUrl} />} meta={`${formatNumber(item.energy, 0)} cal · ${item.servings[0] ? `${item.servings[0].quantity ?? 1} ${item.servings[0].unit ?? 'serving'}` : 'Serving unavailable'}`} testId={`restaurant-menu-item-${index}`} title={item.name ?? 'Unnamed menu item'} />)
            : <div className="p-6 text-pretty text-sm text-stone-600" data-testid="menu-empty">{query ? `No dishes match “${query}” in this restaurant. Try another name or show the full menu.` : 'No matching menu items were returned for this restaurant.'}</div>}
        </Card> : null}
    </div>
  </div>
}
