import type { Restaurant } from '@januaryai/sdk'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Building2,
  Search as SearchIcon,
  Utensils,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  autocompleteFoods,
  searchFoodCatalog,
  searchRestaurantMenuItems,
  searchRestaurants,
} from '~/api/january.functions'
import { ChipSelector } from '~/components/chip-selector'
import { FoodSuggestionList } from '~/components/food-autocomplete'
import { NetworkImage } from '~/components/network-image'
import { LocationChooser, cityLocations, defaultCity, type CityID, type Coordinates } from '~/components/search/location-chooser'
import { RestaurantInspector } from '~/components/search/restaurant-inspector'
import { SegmentedControl } from '~/components/segmented-control'
import {
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  InputFrame,
  Page,
  PageHeader,
  ResultRow,
  SectionLabel,
  SkeletonList,
} from '~/components/ui'
import { formatNumber } from '~/lib/utils'
import { primaryServingLabel } from '~/lib/food-display'

type CatalogKind = 'foods' | 'restaurants'
type FoodMode = 'name' | 'description' | 'barcode'
type FoodCategoryFilter = 'all' | 'general' | 'branded' | 'recipe'
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
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [debouncedDraft, setDebouncedDraft] = useState(draft.trim())
  const [acceptedSuggestion, setAcceptedSuggestion] = useState<string | null>(null)
  const submittedQuery = search.q?.trim() ?? ''

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedDraft(draft.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [draft])

  const suggestions = useQuery({
    queryKey: ['food-suggestions', { query: debouncedDraft, category }],
    queryFn: () => autocompleteFoods({ data: {
      query: debouncedDraft,
      limit: 8,
      ...(category === 'general' || category === 'branded' ? { category } : {}),
    } }),
    enabled: kind === 'foods'
      && mode === 'name'
      && category !== 'recipe'
      && debouncedDraft.length >= 2
      && debouncedDraft.length <= 64
      && debouncedDraft !== acceptedSuggestion,
  })

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
    setSelectedRestaurant(null)
    void navigate({ search: { q } })
  }

  function chooseSuggestion(name: string) {
    setDraft(name)
    setDebouncedDraft(name)
    setAcceptedSuggestion(name)
    setSelectedRestaurant(null)
    void navigate({ search: { q: name } })
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
            <SegmentedControl
              className="mt-3"
              label="Search source"
              name="catalog-kind"
              onChange={(value) => { setKind(value); setSelectedRestaurant(null) }}
              options={[{ value: 'foods', label: 'Foods' }, { value: 'restaurants', label: 'Restaurants' }]}
              value={kind}
            />

            <div className="mt-6">
              <label className="mb-2 block text-sm font-semibold text-stone-700" htmlFor="catalog-search">{kind === 'foods' ? 'What are you looking for?' : 'Restaurant or cuisine'}</label>
              <InputFrame className="min-h-14" htmlFor="catalog-search">
                <SearchIcon aria-hidden="true" className="size-5 text-stone-500" />
                <input
                  className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-stone-400"
                  id="catalog-search"
                  onChange={(event) => { setDraft(event.target.value); setAcceptedSuggestion(null) }}
                  placeholder={kind === 'foods' ? 'Try “Greek yogurt”' : 'Try “pizza”'}
                  value={draft}
                />
              </InputFrame>
            </div>

            {draft.trim() !== acceptedSuggestion && suggestions.data?.items.length ? (
              <div className="mt-2"><FoodSuggestionList items={suggestions.data.items} onSelect={(suggestion) => chooseSuggestion(suggestion.name)} /></div>
            ) : null}

            {kind === 'foods' ? (
              <>
                <SegmentedControl<FoodMode>
                  className="mt-5"
                  label="Search by"
                  name="food-mode"
                  onChange={setMode}
                  options={[{ value: 'name', label: 'Name' }, { value: 'description', label: 'Meal description' }, { value: 'barcode', label: 'Barcode' }]}
                  value={mode}
                  variant="outlined"
                />

                {mode === 'name' && (
                  <ChipSelector<FoodCategoryFilter>
                    className="mt-5"
                    label="Category"
                    name="food-category"
                    onChange={setCategory}
                    options={[{ value: 'all', label: 'All' }, { value: 'general', label: 'General' }, { value: 'branded', label: 'Branded' }, { value: 'recipe', label: 'Recipe' }]}
                    value={category}
                  />
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
            <div>
              {foods.data.items.length ? (
                <Card className="overflow-hidden">
                  {foods.data.items.map((food) => (
                    <ResultRow
                      key={food.id}
                      media={<NetworkImage alt="" className="size-full" fallback={<Utensils aria-hidden="true" className="size-6 text-stone-600" />} src={food.photoUrl} />}
                      meta={`${formatNumber(food.calories, 0)} cal · ${primaryServingLabel(food)}`}
                      onClick={() => void navigate({
                        to: '/food/$foodId',
                        params: { foodId: String(food.id) },
                        search: { q: food.name },
                      })}
                      title={food.name}
                    />
                  ))}
                </Card>
              ) : (
                <EmptyState description="Try a broader name or a different search mode." icon={<Utensils aria-hidden="true" className="size-6" />} title="No foods matched" />
              )}
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
