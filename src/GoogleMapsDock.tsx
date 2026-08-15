import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ExternalLink,
  LocateFixed,
  Map as MapIcon,
  Navigation,
  Route,
  Search,
} from 'lucide-react'

type TripContext = 'sado' | 'arima'

type GoogleMapsDockProps = {
  tripId: string
  selectedPlace: string
}

const RYOTSU_PORT = '両津港 佐渡市 新潟県'
const FUTATSUGAME = 'SADO二ツ亀ビューホテル 佐渡市 新潟県'
const SANNOMIYA_STATION = '三ノ宮駅 神戸市 兵庫県'
const ARIMA_STATION = '有馬温泉駅 神戸市 兵庫県'

function contextFromTripId(tripId: string): TripContext {
  return tripId === 'arima-onsen-2026' ? 'arima' : 'sado'
}

function defaultSearch(context: TripContext) {
  return context === 'arima' ? '神戸 有馬温泉' : '佐渡島'
}

function withTripContext(value: string, context: TripContext) {
  const trimmed = value.trim()
  if (!trimmed) return defaultSearch(context)

  if (context === 'arima') {
    if (/有馬|三宮|神戸|兵庫/.test(trimmed)) return trimmed
    return `${trimmed} 神戸市 兵庫県`
  }

  if (/佐渡|新潟/.test(trimmed)) return trimmed
  return `${trimmed} 佐渡市 新潟県`
}

function mapsSearchUrl(query: string, context: TripContext) {
  const params = new URLSearchParams({ api: '1', query: withTripContext(query, context) })
  return `https://www.google.com/maps/search/?${params.toString()}`
}

function mapsDirectionsUrl(destination: string, context: TripContext) {
  const params = new URLSearchParams({
    api: '1',
    destination: withTripContext(destination, context),
    travelmode: 'transit',
    dir_action: 'navigate',
  })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

function primaryRouteUrl(context: TripContext) {
  const params = new URLSearchParams({
    api: '1',
    origin: context === 'arima' ? SANNOMIYA_STATION : RYOTSU_PORT,
    destination: context === 'arima' ? ARIMA_STATION : FUTATSUGAME,
    travelmode: 'transit',
  })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

function directionsDestination(selectedPlace: string, context: TripContext) {
  if (context === 'sado' && selectedPlace === '両津港') return FUTATSUGAME
  if (context === 'arima' && /三ノ宮駅|三宮駅/.test(selectedPlace)) return ARIMA_STATION
  return withTripContext(selectedPlace, context)
}

export default function GoogleMapsDock({ tripId, selectedPlace }: GoogleMapsDockProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
  const tripContext = contextFromTripId(tripId)
  const searchQuery = defaultSearch(tripContext)
  const [viewMode, setViewMode] = useState<'place' | 'directions'>('place')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setViewMode('place')
  }, [tripId, selectedPlace])

  const embedUrl = useMemo(() => {
    if (!apiKey) return null

    const params = new URLSearchParams({
      key: apiKey,
      language: 'ja',
      region: 'JP',
    })

    if (viewMode === 'directions') {
      params.set('origin', tripContext === 'arima' ? SANNOMIYA_STATION : RYOTSU_PORT)
      params.set('destination', directionsDestination(selectedPlace, tripContext))
      params.set('mode', 'transit')
      params.set('units', 'metric')
      return `https://www.google.com/maps/embed/v1/directions?${params.toString()}`
    }

    params.set('q', withTripContext(selectedPlace, tripContext))
    params.set('zoom', '13')
    return `https://www.google.com/maps/embed/v1/place?${params.toString()}`
  }, [apiKey, selectedPlace, tripContext, viewMode])

  return (
    <aside className={`google-maps-dock ${isOpen ? 'is-open' : ''}`} aria-label="Google Maps 連携">
      <button
        className="google-maps-dock-toggle"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="google-maps-dock-body"
        aria-label={isOpen ? 'Google Mapsを閉じる' : 'Google Mapsを開く'}
      >
        <span><MapIcon size={17} /> {isOpen ? 'Google Maps' : '地図'}</span>
        <ChevronDown size={17} />
      </button>

      {isOpen && (
        <div className="google-maps-dock-body" id="google-maps-dock-body">
          <div className="google-maps-dock-head">
            <div aria-live="polite">
              <small>選択中の場所</small>
              <strong>{selectedPlace}</strong>
            </div>
            <a href={mapsSearchUrl(searchQuery, tripContext)} target="_blank" rel="noreferrer">
              <Search size={15} />「{searchQuery}」を検索
            </a>
          </div>

          <div className="google-maps-mode-tabs" role="group" aria-label="地図表示モード">
            <button
              type="button"
              aria-pressed={viewMode === 'place'}
              className={viewMode === 'place' ? 'active' : ''}
              onClick={() => setViewMode('place')}
            >
              <MapIcon size={14} /> 場所
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'directions'}
              className={viewMode === 'directions' ? 'active' : ''}
              onClick={() => setViewMode('directions')}
            >
              <Route size={14} /> {tripContext === 'arima' ? '三宮から' : '両津港から'}
            </button>
          </div>

          <div className="google-maps-frame">
            {embedUrl ? (
              <iframe
                title={`${selectedPlace}のGoogle Maps`}
                src={embedUrl}
                loading="lazy"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <div className="google-maps-key-state">
                <MapIcon size={29} />
                <strong>Google Maps APIキーを設定してください</strong>
                <span>GitHub Secret「GOOGLE_MAPS_API_KEY」を登録すると、次回デプロイから地図が表示されます。</span>
              </div>
            )}
          </div>

          <div className="google-maps-actions">
            <a href={mapsSearchUrl(selectedPlace, tripContext)} target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> Mapsで開く
            </a>
            <a href={mapsDirectionsUrl(selectedPlace, tripContext)} target="_blank" rel="noreferrer">
              <LocateFixed size={14} /> 現在地から
            </a>
            <a href={primaryRouteUrl(tripContext)} target="_blank" rel="noreferrer">
              <Navigation size={14} /> 主要区間
            </a>
          </div>
          <p className="google-maps-note">複数日の旅程を1本の公共交通ルートに偽装せず、選択地点と主要区間だけをGoogle Mapsへ渡します。</p>
        </div>
      )}
    </aside>
  )
}
