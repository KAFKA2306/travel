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

const SADO_DEFAULT_PLACE = 'SADO二ツ亀ビューホテル'
const ARIMA_DEFAULT_PLACE = '神戸三宮 東急REIホテル'
const RYOTSU_PORT = '両津港 佐渡市 新潟県'
const SANNOMIYA_STATION = '三ノ宮駅 神戸市 兵庫県'

function contextFromTripId(tripId: string): TripContext {
  return tripId === 'arima-onsen-2026' ? 'arima' : 'sado'
}

function defaultPlace(context: TripContext) {
  return context === 'arima' ? ARIMA_DEFAULT_PLACE : SADO_DEFAULT_PLACE
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

function fullItineraryUrl(context: TripContext) {
  const params = context === 'arima'
    ? new URLSearchParams({
      api: '1',
      origin: SANNOMIYA_STATION,
      destination: SANNOMIYA_STATION,
      waypoints: [
        '有馬温泉駅 神戸市 兵庫県',
        '有馬本温泉 金の湯 神戸市 兵庫県',
        '有馬温泉街 神戸市 兵庫県',
      ].join('|'),
      travelmode: 'transit',
    })
    : new URLSearchParams({
      api: '1',
      origin: RYOTSU_PORT,
      destination: 'HOTEL OOSADO 佐渡市 新潟県',
      waypoints: [
        'SADO二ツ亀ビューホテル 佐渡市 新潟県',
        '二ツ亀 佐渡市 新潟県',
        '相川 佐渡市 新潟県',
      ].join('|'),
      travelmode: 'transit',
    })

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

function GoogleMapsDock() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
  const [tripContext, setTripContext] = useState<TripContext>('sado')
  const [selectedPlace, setSelectedPlace] = useState(SADO_DEFAULT_PLACE)
  const [searchQuery, setSearchQuery] = useState(defaultSearch('sado'))
  const [viewMode, setViewMode] = useState<'place' | 'directions'>('place')
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    const tripSelect = document.querySelector<HTMLSelectElement>('select[aria-label="保存済みの旅程モデルを選択"]')

    const syncTrip = () => {
      const nextContext = contextFromTripId(tripSelect?.value || 'sado-summer-2026')
      setTripContext(nextContext)
      setSearchQuery(defaultSearch(nextContext))

      const selectedCardName = document
        .querySelector<HTMLElement>('.place-card.selected .place-title-row b')
        ?.textContent?.trim()
      setSelectedPlace(selectedCardName || defaultPlace(nextContext))
      setViewMode('place')
    }

    syncTrip()
    tripSelect?.addEventListener('change', syncTrip)

    const handleDocumentClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return

      const placeCard = event.target.closest<HTMLButtonElement>('.place-card')
      const placeName = placeCard?.querySelector<HTMLElement>('.place-title-row b')?.textContent?.trim()
      if (placeName) {
        setSelectedPlace(placeName)
        setViewMode('place')
        return
      }

      const mapNode = event.target.closest<HTMLButtonElement>('.map-node')
      const nodeName = mapNode?.title.trim() || mapNode?.getAttribute('aria-label')?.replace(/を選択$/, '').trim()
      if (nodeName) {
        setSelectedPlace(nodeName)
        setViewMode('place')
      }
    }

    const syncSelectedPlace = () => {
      const selectedCardName = document
        .querySelector<HTMLElement>('.place-card.selected .place-title-row b')
        ?.textContent?.trim()
      const selectedNode = document.querySelector<HTMLButtonElement>('.map-node.selected')
      const selectedNodeName = selectedNode?.title.trim()
        || selectedNode?.getAttribute('aria-label')?.replace(/を選択$/, '').trim()
      const nextPlace = selectedCardName || selectedNodeName
      if (nextPlace) setSelectedPlace(nextPlace)
    }

    syncSelectedPlace()
    const appShell = document.querySelector('.app-shell')
    const observer = appShell ? new MutationObserver(syncSelectedPlace) : null
    observer?.observe(appShell!, { attributes: true, subtree: true, attributeFilter: ['class'] })

    document.addEventListener('click', handleDocumentClick)
    return () => {
      tripSelect?.removeEventListener('change', syncTrip)
      document.removeEventListener('click', handleDocumentClick)
      observer?.disconnect()
    }
  }, [])

  const embedUrl = useMemo(() => {
    if (!apiKey) return null

    const params = new URLSearchParams({
      key: apiKey,
      language: 'ja',
      region: 'JP',
    })

    if (viewMode === 'directions') {
      params.set('origin', tripContext === 'arima' ? SANNOMIYA_STATION : RYOTSU_PORT)
      params.set(
        'destination',
        tripContext === 'sado' && selectedPlace === '両津港'
          ? 'SADO二ツ亀ビューホテル 佐渡市 新潟県'
          : withTripContext(selectedPlace, tripContext),
      )
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
      >
        <span><MapIcon size={17} /> Google Maps</span>
        <ChevronDown size={17} />
      </button>

      {isOpen && (
        <div className="google-maps-dock-body">
          <div className="google-maps-dock-head">
            <div>
              <small>選択中の場所</small>
              <strong>{selectedPlace}</strong>
            </div>
            <a href={mapsSearchUrl(searchQuery, tripContext)} target="_blank" rel="noreferrer">
              <Search size={15} />「{searchQuery}」を検索
            </a>
          </div>

          <div className="google-maps-mode-tabs" role="tablist" aria-label="地図表示モード">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'place'}
              className={viewMode === 'place' ? 'active' : ''}
              onClick={() => setViewMode('place')}
            >
              <MapIcon size={14} /> 場所
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'directions'}
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
            <a href={fullItineraryUrl(tripContext)} target="_blank" rel="noreferrer">
              <Navigation size={14} /> 旅程全体
            </a>
          </div>
        </div>
      )}
    </aside>
  )
}

export default GoogleMapsDock
