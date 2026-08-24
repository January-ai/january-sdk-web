import type { FoodSearchItem, Restaurant, SearchRestaurantMenuItemsResponse } from '@januaryai/partner-sdk'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Building2,
  Crosshair,
  MapPin,
  Search as SearchIcon,
  Utensils,
} from 'lucide-react'
import { useState } from 'react'
import {
  searchFoodCatalog,
  searchRestaurantMenuItems,
  searchRestaurants,
} from '~/api/january.functions'
import {
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Page,
  PageHeader,
  ResultRow,
  SectionLabel,
  SkeletonList,
} from '~/components/ui'
import { cn, formatNumber } from '~/lib/utils'

type CatalogKind = 'foods' | 'restaurants'
type FoodMode = 'name' | 'description' | 'barcode'
type FoodCategoryFilter = 'all' | 'general' | 'branded' | 'recipe'
type Coordinates = { latitude: number; longitude: number }

const cityLocations = [
  { id: 'san-francisco', name: 'San Francisco, CA', latitude: 37.7749, longitude: -122.4194 },
  { id: 'new-york', name: 'New York, NY', latitude: 40.7128, longitude: -74.006 },
  { id: 'los-angeles', name: 'Los Angeles, CA', latitude: 34.0522, longitude: -118.2437 },
  { id: 'chicago', name: 'Chicago, IL', latitude: 41.8781, longitude: -87.6298 },
  { id: 'austin', name: 'Austin, TX', latitude: 30.2672, longitude: -97.7431 },
  { id: 'miami', name: 'Miami, FL', latitude: 25.7617, longitude: -80.1918 },
  { id: 'seattle', name: 'Seattle, WA', latitude: 47.6062, longitude: -122.3321 },
] as const

type CityID = (typeof cityLocations)[number]['id']
const defaultCity = cityLocations[0]

interface SearchParams {
  q?: string
}

export const Route = createFileRoute('/search')({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search.q === 'string' ? search.q : undefined,
  }),
  component: SearchPage,
})

function SearchPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/search' })
  const [draft, setDraft] = useState(search.q ?? '')
  const [kind, setKind] = useState<CatalogKind>('foods')
  const [mode, setMode] = useState<FoodMode>('name')
  const [category, setCategory] = useState<FoodCategoryFilter>('all')
  const [coordinates, setCoordinates] = useState<Coordinates>({ latitude: defaultCity.latitude, longitude: defaultCity.longitude })
  const [locationSource, setLocationSource] = useState<CityID | 'current'>(defaultCity.id)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [selectedFood, setSelectedFood] = useState<FoodSearchItem | null>(null)
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const submittedQuery = search.q?.trim() ?? ''

  const foods = useQuery({
    queryKey: ['foods', { query: submittedQuery, mode, category }],
    queryFn: () => searchFoodCatalog({ data: {
      query: submittedQuery,
      mode,
      ...(category !== 'all' && mode === 'name' ? { category } : {}),
    } }),
    enabled: kind === 'foods' && submittedQuery.length > 0,
  })

  const restaurants = useQuery({
    queryKey: ['restaurants', { query: submittedQuery, coordinates }],
    queryFn: () => searchRestaurants({ data: { query: submittedQuery, ...coordinates! } }),
    enabled: kind === 'restaurants' && submittedQuery.length > 0 && coordinates !== null,
  })

  const menuItems = useQuery({
    queryKey: ['restaurant-menu-items', { restaurant: selectedRestaurant?.id, coordinates }],
    queryFn: () => searchRestaurantMenuItems({ data: {
      query: selectedRestaurant!.name,
      ...coordinates!,
    } }),
    enabled: selectedRestaurant !== null && coordinates !== null,
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const q = draft.trim()
    if (!q) return
    setSelectedFood(null)
    setSelectedRestaurant(null)
    void navigate({ search: { q } })
  }

  function requestLocation() {
    setLocationError(null)
    if (!navigator.geolocation) {
      setLocationError('Location is not available in this browser.')
      return
    }
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates({ latitude: coords.latitude, longitude: coords.longitude })
        setLocationSource('current')
        setIsLocating(false)
      },
      () => {
        setLocationError('Allow location access to use your current position, or choose a city instead.')
        setIsLocating(false)
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    )
  }

  function selectCity(id: CityID) {
    const city = cityLocations.find((item) => item.id === id) ?? defaultCity
    setLocationSource(city.id)
    setCoordinates({ latitude: city.latitude, longitude: city.longitude })
    setLocationError(null)
  }

  const activeQuery = kind === 'foods' ? foods : restaurants

  return (
    <Page>
      <PageHeader
        aside={<div className="hidden rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-600 md:block">Food intelligence · Live</div>}
        description="Search nutrition data, understand servings, and move from nearby restaurants to their menu—all through the TypeScript SDK."
        eyebrow="January nutrition explorer"
        title="Find something worth knowing."
      />

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.45fr)] xl:items-start">
        <Card className="p-5 sm:p-6 xl:sticky xl:top-8">
          <form onSubmit={submit}>
            <SectionLabel>Search source</SectionLabel>
            <fieldset className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-[#eee8dc] p-1.5">
              <legend className="sr-only">Search source</legend>
              {(['foods', 'restaurants'] as const).map((value) => (
                <label className={cn('flex min-h-12 cursor-pointer items-center justify-center rounded-xl text-sm font-bold', kind === value ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-600')} key={value}>
                  <input className="sr-only" checked={kind === value} name="catalog-kind" onChange={() => { setKind(value); setSelectedFood(null); setSelectedRestaurant(null) }} type="radio" value={value} />
                  {value === 'foods' ? 'Foods' : 'Restaurants'}
                </label>
              ))}
            </fieldset>

            <label className="mt-6 block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">{kind === 'foods' ? 'What are you looking for?' : 'Restaurant or cuisine'}</span>
              <span className="flex min-h-14 items-center gap-3 rounded-2xl border border-stone-300 bg-white px-4 focus-within:border-stone-900 focus-within:ring-2 focus-within:ring-stone-900/10">
                <SearchIcon aria-hidden="true" className="size-5 text-stone-500" />
                <input
                  className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-stone-400"
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={kind === 'foods' ? 'Try “Greek yogurt”' : 'Try “pizza”'}
                  value={draft}
                />
              </span>
            </label>

            {kind === 'foods' ? (
              <>
                <fieldset className="mt-5">
                  <legend className="text-sm font-semibold text-stone-700">Search by</legend>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(['name', 'description', 'barcode'] as const).map((value) => (
                      <label className={cn('flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-2 text-center text-xs font-bold', mode === value ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-300 bg-white text-stone-600')} key={value}>
                        <input className="sr-only" checked={mode === value} name="food-mode" onChange={() => setMode(value)} type="radio" value={value} />
                        {value === 'name' ? 'Name' : value === 'description' ? 'Meal description' : 'Barcode'}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {mode === 'name' && (
                  <fieldset className="mt-5">
                    <legend className="text-sm font-semibold text-stone-700">Category</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(['all', 'general', 'branded', 'recipe'] as const).map((value) => (
                        <label className={cn('cursor-pointer rounded-full border px-4 py-2 text-sm font-bold', category === value ? 'border-[#d5a817] bg-[#f7e7a4] text-stone-950' : 'border-stone-300 bg-white text-stone-600')} key={value}>
                          <input className="sr-only" checked={category === value} name="food-category" onChange={() => setCategory(value)} type="radio" value={value} />
                          {value[0].toUpperCase() + value.slice(1)}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
              </>
            ) : (
              <div className="mt-5">
                <LocationChooser
                  coordinates={coordinates}
                  isLocating={isLocating}
                  locationSource={locationSource}
                  onCityChange={selectCity}
                  onCurrentLocation={requestLocation}
                />
                {locationError && <p className="mt-2 text-pretty text-sm text-red-700">{locationError}</p>}
              </div>
            )}

            <Button className="mt-6 w-full" disabled={!draft.trim()} type="submit">
              {kind === 'foods' ? 'Search foods' : 'Search nearby'}
            </Button>
          </form>
        </Card>

        <section aria-live="polite" aria-busy={activeQuery.isFetching}>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <SectionLabel>Results</SectionLabel>
              <h2 className="mt-2 text-balance font-serif text-3xl sm:text-4xl">
                {submittedQuery ? `For “${submittedQuery}”` : 'Ready when you are'}
              </h2>
            </div>
            {activeQuery.data && <span className="data-number text-sm font-bold text-stone-500">{activeQuery.data.totalCount} found</span>}
          </div>

          {!submittedQuery ? (
            <EmptyState description="Choose a source, enter a query, and the results will appear here without leaving this workspace." icon={<SearchIcon aria-hidden="true" className="size-6" />} title="Start with a food or restaurant" />
          ) : activeQuery.isPending ? (
            <SkeletonList />
          ) : activeQuery.isError ? (
            <ErrorMessage error={activeQuery.error} />
          ) : kind === 'foods' && foods.data ? (
            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">
              {foods.data.items.length ? (
                <Card className="overflow-hidden">
                  {foods.data.items.map((food) => (
                    <ResultRow
                      key={food.id}
                      media={food.photoUrl ? <img alt="" className="size-full object-cover" src={food.photoUrl} /> : <Utensils aria-hidden="true" className="size-6 text-stone-600" />}
                      meta={`${formatNumber(food.calories, 0)} cal · ${primaryServing(food)}`}
                      onClick={() => setSelectedFood(food)}
                      title={food.name}
                    />
                  ))}
                </Card>
              ) : (
                <EmptyState description="Try a broader name or a different search mode." icon={<Utensils aria-hidden="true" className="size-6" />} title="No foods matched" />
              )}
              <FoodInspector food={selectedFood ?? foods.data.items[0] ?? null} />
            </div>
          ) : restaurants.data ? (
            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
              <Card className="overflow-hidden">
                {restaurants.data.items.map((restaurant) => (
                  <ResultRow
                    key={restaurant.id}
                    media={<Building2 aria-hidden="true" className="size-6 text-stone-600" />}
                    meta={[restaurant.city, restaurant.distance != null ? `${formatNumber(restaurant.distance)} mi` : null].filter(Boolean).join(' · ')}
                    onClick={() => setSelectedRestaurant(restaurant)}
                    title={restaurant.name}
                  />
                ))}
              </Card>
              <RestaurantInspector menuItems={menuItems} restaurant={selectedRestaurant} />
            </div>
          ) : null}
        </section>
      </div>
    </Page>
  )
}

function LocationChooser({
  coordinates,
  isLocating,
  locationSource,
  onCityChange,
  onCurrentLocation,
}: {
  coordinates: Coordinates
  isLocating: boolean
  locationSource: CityID | 'current'
  onCityChange: (id: CityID) => void
  onCurrentLocation: () => void
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-stone-700">Search location</legend>
      <select
        aria-label="Search city"
        className="mt-2 min-h-14 w-full rounded-2xl border border-stone-300 bg-white px-4 text-sm font-bold text-stone-950 focus:border-stone-900"
        onChange={(event) => onCityChange(event.target.value as CityID)}
        value={locationSource}
      >
        {locationSource === 'current' && <option value="current">Current location</option>}
        {cityLocations.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
      </select>
      <p className="data-number mt-2 text-xs text-stone-500">
        {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
      </p>
      <button
        className="mt-3 flex min-h-14 w-full items-center gap-3 rounded-2xl border border-stone-300 bg-white px-4 text-left hover:bg-stone-50 disabled:cursor-wait disabled:text-stone-400"
        disabled={isLocating}
        onClick={onCurrentLocation}
        type="button"
      >
        <Crosshair aria-hidden="true" className="size-5 text-stone-600" />
        <span className="flex-1">
          <span className="block text-sm font-bold">{isLocating ? 'Finding your location…' : 'Use my current location'}</span>
          <span className="block text-xs text-stone-500">Uses the browser location permission</span>
        </span>
      </button>
    </fieldset>
  )
}

function FoodInspector({ food }: { food: FoodSearchItem | null }) {
  if (!food) return null
  return (
    <Card className="self-start p-6 2xl:sticky 2xl:top-8">
      <SectionLabel>Selected food</SectionLabel>
      <h3 className="mt-3 text-balance font-serif text-3xl">{food.name}</h3>
      {food.brandName && <p className="mt-1 text-sm text-stone-500">{food.brandName}</p>}
      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-stone-200 bg-stone-200">
        {[
          ['Calories', food.calories, 'cal'],
          ['Protein', food.protein, 'g'],
          ['Carbs', food.carbohydrates, 'g'],
          ['Fat', food.totalFat, 'g'],
        ].map(([label, value, unit]) => (
          <div className="bg-white p-4" key={String(label)}>
            <div className="text-xs font-bold uppercase text-stone-500">{label}</div>
            <div className="data-number mt-2 text-2xl font-bold">{formatNumber(value as number | null)} <span className="text-sm font-medium text-stone-500">{unit}</span></div>
          </div>
        ))}
      </div>
      <div className="mt-5 text-sm leading-6 text-stone-600">
        {food.servings.length ? `${food.servings.length} serving option${food.servings.length === 1 ? '' : 's'} available.` : 'No serving options returned.'}
      </div>
    </Card>
  )
}

function RestaurantInspector({ restaurant, menuItems }: { restaurant: Restaurant | null; menuItems: UseQueryResult<SearchRestaurantMenuItemsResponse, Error> }) {
  if (!restaurant) {
    return <EmptyState description="Select a restaurant to load matching menu items." icon={<MapPin aria-hidden="true" className="size-6" />} title="Choose a restaurant" />
  }
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <SectionLabel>Restaurant</SectionLabel>
        <h3 className="mt-3 text-balance font-serif text-3xl">{restaurant.name}</h3>
        <p className="mt-3 text-pretty text-sm leading-6 text-stone-600">{[restaurant.address1, restaurant.city].filter(Boolean).join(', ') || 'Location details unavailable'}</p>
      </Card>
      {menuItems.isPending ? <SkeletonList /> : menuItems.isError ? <ErrorMessage error={menuItems.error} /> : menuItems.data ? (
        <Card className="overflow-hidden">
          {menuItems.data.items.length ? menuItems.data.items.map((item: { id: string; name: string; photoUrl?: string | null; energy?: number | null; servings: Array<{ quantity: number; unit: string }> }) => (
            <ResultRow key={item.id} media={item.photoUrl ? <img alt="" className="size-full object-cover" src={item.photoUrl} /> : <Utensils aria-hidden="true" className="size-6 text-stone-600" />} meta={`${formatNumber(item.energy, 0)} cal · ${item.servings[0] ? `${item.servings[0].quantity} ${item.servings[0].unit}` : 'Serving unavailable'}`} title={item.name} />
          )) : <div className="p-6 text-pretty text-sm text-stone-600">No matching menu items were returned for this restaurant.</div>}
        </Card>
      ) : null}
    </div>
  )
}

function primaryServing(food: FoodSearchItem) {
  const serving = food.servings.find((item) => item.isPrimary) ?? food.servings[0]
  return serving ? `${formatNumber(serving.quantity)} ${serving.unit}` : 'Serving unavailable'
}
