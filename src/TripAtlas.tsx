import { ArrowDown, MapPinned } from 'lucide-react'
import { arimaItinerary, itinerary, places } from './data'
import type { ItineraryItem, Place } from './types'
import './trip-atlas.css'

type TripAtlasProps = {
  tripId: string
  destination: string
  selectedPlaceId: string
  onSelectPlace: (placeId: string) => void
}

type RouteStop = {
  item: ItineraryItem
  place: Place
}

const SADO_TRIP_ID = 'sado-summer-2026'
const ARIMA_TRIP_ID = 'arima-onsen-2026'

const shortLabels: Record<string, string> = {
  'futatsugame-hotel': '二ツ亀ホテル',
  'oosado-hotel': 'HOTEL OOSADO',
  futatsugame: '二ツ亀',
  'ryotsu-port': '両津港',
  aikawa: '相川',
  kitazawa: '北沢浮遊選鉱場跡',
  'sannomiya-rei': '神戸三宮 東急REIホテル',
  'sannomiya-station': '三ノ宮駅・三宮駅',
  'arima-station': '有馬温泉駅',
  'arima-town': '有馬温泉街',
  'kin-no-yu': '金の湯',
  'arima-roku': 'ホテルハーヴェスト有馬六彩',
}

const isPlaceInTrip = (place: Place, tripId: string) => (
  place.tripId ? place.tripId === tripId : tripId === SADO_TRIP_ID
)

function routeStops(items: ItineraryItem[], tripPlaces: Place[]) {
  const byId = new Map(tripPlaces.map((place) => [place.id, place]))

  return items.reduce<RouteStop[]>((result, item) => {
    if (!item.placeId) return result
    const place = byId.get(item.placeId)
    if (!place) return result

    const previous = result.at(-1)
    if (previous?.place.id === place.id && previous.item.day === item.day) return result

    result.push({ item, place })
    return result
  }, [])
}

function labelForPlace(place: Place) {
  return shortLabels[place.id] ?? place.name
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
  const stops = routeStops(activeItinerary, tripPlaces)
  const routePlaceIds = new Set(stops.map(({ place }) => place.id))
  const alternatives = tripPlaces.filter((place) => !routePlaceIds.has(place.id))

  return (
    <figure className="atlas-card trip-atlas" aria-labelledby="trip-atlas-title">
      <div className="atlas-header">
        <span id="trip-atlas-title"><MapPinned size={16} /> {destination}の順路</span>
        <div className="atlas-legend">
          <em>実行順に表示・縮尺なし</em>
        </div>
      </div>

      <ol className="route-list" aria-label={`${destination}の旅程順路`}>
        {stops.map(({ item, place }, index) => {
          const selected = selectedPlaceId === place.id

          return (
            <li key={`${item.id}-${place.id}`} className={selected ? 'selected' : ''}>
              <button
                type="button"
                className={`route-stop accent-${place.accent}`}
                onClick={() => onSelectPlace(place.id)}
                aria-pressed={selected}
              >
                <span className="route-stop-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="route-stop-copy">
                  <small>DAY {item.day} · {item.time}</small>
                  <strong>{labelForPlace(place)}</strong>
                  <span>{place.area}</span>
                </span>
                <span className="route-stop-purpose">{item.title}</span>
              </button>
              {index < stops.length - 1 && <ArrowDown className="route-connector" size={16} aria-hidden="true" />}
            </li>
          )
        })}
      </ol>

      {alternatives.length > 0 && (
        <div className="route-alternatives">
          <div>
            <small>順路外の候補</small>
            <span>比較用に保存され、実行旅程には含みません。</span>
          </div>
          <div className="route-alternative-list">
            {alternatives.map((place) => (
              <button
                key={place.id}
                type="button"
                className={selectedPlaceId === place.id ? 'selected' : ''}
                onClick={() => onSelectPlace(place.id)}
                aria-pressed={selectedPlaceId === place.id}
              >
                {labelForPlace(place)}
              </button>
            ))}
          </div>
        </div>
      )}

      <figcaption className="atlas-caption">
        <strong>{isArima ? '三宮を拠点に有馬温泉を日帰り' : '両津港から北端・相川へ移動'}</strong>
        <span>地点は重ならない一覧形式です。選択すると場所カードとGoogle Mapsが同期します。</span>
      </figcaption>
    </figure>
  )
}
