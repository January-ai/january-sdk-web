import { Crosshair } from 'lucide-react'

export type Coordinates = { latitude: number; longitude: number }

export const cityLocations = [
  { id: 'san-francisco', name: 'San Francisco, CA', latitude: 37.7749, longitude: -122.4194 },
  { id: 'new-york', name: 'New York, NY', latitude: 40.7128, longitude: -74.006 },
  { id: 'los-angeles', name: 'Los Angeles, CA', latitude: 34.0522, longitude: -118.2437 },
  { id: 'chicago', name: 'Chicago, IL', latitude: 41.8781, longitude: -87.6298 },
  { id: 'austin', name: 'Austin, TX', latitude: 30.2672, longitude: -97.7431 },
  { id: 'miami', name: 'Miami, FL', latitude: 25.7617, longitude: -80.1918 },
  { id: 'seattle', name: 'Seattle, WA', latitude: 47.6062, longitude: -122.3321 },
] as const

export type CityID = (typeof cityLocations)[number]['id']
export const defaultCity = cityLocations[0]

export function LocationChooser({ coordinates, isLocating, locationSource, onCityChange, onCurrentLocation }: { coordinates: Coordinates; isLocating: boolean; locationSource: CityID | 'current'; onCityChange(id: CityID): void; onCurrentLocation(): void }) {
  return <fieldset><legend className="text-sm font-semibold text-stone-700">Search location</legend><select aria-label="Search city" className="mt-2 min-h-14 w-full rounded-2xl border border-stone-300 bg-white px-4 text-sm font-bold text-stone-950 outline-none transition-colors focus:bg-stone-50" onChange={(event) => onCityChange(event.target.value as CityID)} value={locationSource}>{locationSource === 'current' && <option value="current">Current location</option>}{cityLocations.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select><p className="data-number mt-2 text-xs text-stone-500">{coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}</p><button className="mt-3 flex min-h-14 w-full items-center gap-3 rounded-2xl border border-stone-300 bg-white px-4 text-left hover:bg-stone-50 disabled:cursor-wait disabled:text-stone-400" disabled={isLocating} onClick={onCurrentLocation} type="button"><Crosshair aria-hidden="true" className="size-5 text-stone-600" /><span className="flex-1"><span className="block text-sm font-bold">{isLocating ? 'Finding your location…' : 'Use my current location'}</span><span className="block text-xs text-stone-500">Uses the browser location permission</span></span></button></fieldset>
}
