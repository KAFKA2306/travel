import { MapPinned } from 'lucide-react'
import { arimaItinerary, itinerary, places } from './data'
import type { ItineraryItem, Place } from './types'
import './trip-atlas.css'

type TripAtlasProps = {
  tripId: string
  destination: string
  selectedPlaceId: string
  onSelectPlace: (placeId: string) => void
}

type LabelPlacement = 'above' | 'below' | 'left' | 'right'

const SADO_TRIP_ID = 'sado-summer-2026'
const ARIMA_TRIP_ID = 'arima-onsen-2026'

const shortLabels: Record<string, string> = {
  'futatsugame-hotel': '二ツ亀ホテル',
  'oosado-hotel': 'OOSADO',
  futatsugame: '二ツ亀',
  'ryotsu-port': '両津港',
  aikawa: '相川',
  kitazawa: '北沢遺構',
  'sannomiya-rei': '三宮REI',
  'sannomiya-station': '三宮駅',
  'arima-station': '有馬温泉駅',
  'arima-town': '温泉街',
  'kin-no-yu': '金の湯',
  'arima-roku': '有馬六彩',
}

const labelPlacements: Record<string, LabelPlacement> = {
  'futatsugame-hotel': 'left',
  'oosado-hotel': 'below',
  futatsugame: 'right',
  'ryotsu-port': 'right',
  aikawa: 'left',
  kitazawa: 'above',
  'sannomiya-rei': 'below',
  'sannomiya-station': 'above',
  'arima-station': 'below',
  'arima-town': 'left',
  'kin-no-yu': 'left',
  'arima-roku': 'right',
}

const isPlaceInTrip = (place: Place, tripId: string) => (
  place.tripId ? place.tripId === tripId : tripId === SADO_TRIP_ID
)

function routePlaces(items: ItineraryItem[], tripPlaces: Place[]) {
  const byId = new Map(tripPlaces.map((place) => [place.id, place]))
  return items.reduce<Place[]>((result, item) => {
    if (!item.placeId) return result
    const place = byId.get(item.placeId)
    if (!place || result.at(-1)?.id === place.id) return result
    result.push(place)
    return result
  }, [])
}

function labelForPlace(place: Place) {
  return shortLabels[place.id] ?? place.name.replace('SADO', '').replace('HOTEL ', '')
}

export default function TripAtlas({
  tripId,
  destination,
  selectedPlaceId,
  onSelectPlace,
}: TripAtlasProps) {
  const isArima = tripId === ARIMA_TRIP_ID
  const tripPlaces = places.filter((place) => isPlaceInTrip(place, tripId))
  const activeItinerary = isArima ? arimaItinerary : itinerary
  const route = routePlaces(activeItinerary, tripPlaces)
  const routePointString = route.map((place) => `${place.map.x},${place.map.y}`).join(' ')
  const persistentLabels = new Set(isArima
    ? ['sannomiya-station', 'arima-station']
    : ['futatsugame', 'ryotsu-port', 'aikawa'])

  return (
    <figure className={`atlas-card trip-atlas trip-atlas-${isArima ? 'arima' : 'sado'}`} aria-labelledby="trip-atlas-title">
      <div className="atlas-header">
        <span id="trip-atlas-title"><MapPinned size={16} /> {destination}の移動関係</span>
        <div className="atlas-legend" aria-label="線の意味">
          <i className="legend-bus" />{isArima ? '公共交通' : '島内移動'}
          <i className="legend-ferry" />{isArima ? '徒歩圏' : '航路'}
          <em>概念図・縮尺なし</em>
        </div>
      </div>

      <div className="atlas-surface">
        <svg className="trip-atlas-svg" viewBox="0 0 100 72" aria-hidden="true">
          {isArima ? (
            <>
              <rect className="atlas-zone atlas-zone-city" x="7" y="37" width="36" height="27" rx="9" />
              <rect className="atlas-zone atlas-zone-onsen" x="57" y="7" width="36" height="57" rx="12" />
              <path className="atlas-corridor" d="M31 51 C45 59 57 59 76 57" />
              <text className="atlas-zone-label" x="12" y="44">神戸・三宮</text>
              <text className="atlas-zone-label" x="62" y="14">有馬温泉</text>
            </>
          ) : (
            <>
              <path className="island-shape" d="M77 2C90 7 91 20 82 31c-4 5-3 11-2 17 2 11-9 23-22 21-8-1-9-10-18-10-8 0-18 7-25 1-8-7-1-16 5-22 8-8 16-16 25-20C57 12 65-2 77 2Z" />
              <path className="ferry-line" d="M70 48 C82 52 91 55 103 57" />
            </>
          )}
          {routePointString && <polyline className="route-line trip-route-line" points={routePointString} />}
        </svg>

        {tripPlaces.map((place) => {
          const selected = selectedPlaceId === place.id
          const anchor = persistentLabels.has(place.id)
          const showLabel = selected || anchor
          const placement = labelPlacements[place.id] ?? 'above'

          return (
            <button
              key={place.id}
              type="button"
              className={`map-node accent-${place.accent} label-${placement} ${anchor ? 'is-anchor' : ''} ${selected ? 'selected' : ''}`}
              style={{ left: `${place.map.x}%`, top: `${place.map.y}%` }}
              onClick={() => onSelectPlace(place.id)}
              aria-pressed={selected}
              aria-label={`${place.name}を選択`}
              title={place.name}
            >
              <span />
              {showLabel && <b aria-hidden="true">{labelForPlace(place)}</b>}
            </button>
          )
        })}
      </div>

      <figcaption className="atlas-caption">
        <strong>{isArima ? '三宮 ↔ 有馬温泉・日帰り' : '両津 → 二ツ亀・65分'}</strong>
        <span>地点名は主要拠点と選択中だけを表示します。実経路はGoogle Mapsと公式交通情報で確認します。</span>
      </figcaption>
    </figure>
  )
}
