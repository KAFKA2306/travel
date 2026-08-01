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

const DEFAULT_PLACE = 'SADO二ツ亀ビューホテル'
const DEFAULT_SEARCH = '佐渡島'
const RYOTSU_PORT = '両津港 佐渡市 新潟県'

function withSadoContext(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return DEFAULT_SEARCH
  if (/佐渡|新潟/.test(trimmed)) return trimmed
  return `${trimmed} 佐渡市 新潟県`
}

function mapsSearchUrl(query: string) {
  const params = new URLSearchParams({ api: '1', query: withSadoContext(query) })
  return `https://www.google.com/maps/search/?${params.toString()}`
}

function mapsDirectionsUrl(destination: string) {
  const params = new URLSearchParams({
    api: '1',
    destination: withSadoContext(destination),
    travelmode: 'transit',
    dir_action: 'navigate',
  })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

function fullItineraryUrl() {
  const params = new URLSearchParams({
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
  const [selectedPlace, setSelectedPlace] = useState(DEFAULT_PLACE)
  const [searchQuery, setSearchQuery] = useState(DEFAULT_SEARCH)
  const [viewMode, setViewMode] = useState<'place' | 'directions'>('place')
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    const searchInput = document.querySelector<HTMLInputElement>('input[aria-label="目的地・施設を検索"]')
    const syncSearch = () => setSearchQuery(searchInput?.value.trim() || DEFAULT_SEARCH)
    syncSearch()
    searchInput?.addEventListener('input', syncSearch)

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
      searchInput?.removeEventListener('input', syncSearch)
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
      params.set('origin', RYOTSU_PORT)
      params.set(
        'destination',
        selectedPlace === '両津港' ? 'SADO二ツ亀ビューホテル 佐渡市 新潟県' : withSadoContext(selectedPlace),
      )
      params.set('mode', 'transit')
      params.set('units', 'metric')
      return `https://www.google.com/maps/embed/v1/directions?${params.toString()}`
    }

    params.set('q', withSadoContext(selectedPlace))
    params.set('zoom', '13')
    return `https://www.google.com/maps/embed/v1/place?${params.toString()}`
  }, [apiKey, selectedPlace, viewMode])

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
            <a href={mapsSearchUrl(searchQuery)} target="_blank" rel="noreferrer">
              <Search size={15} />「{searchQuery || DEFAULT_SEARCH}」を検索
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
              <Route size={14} /> 両津港から
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
            <a href={mapsSearchUrl(selectedPlace)} target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> Mapsで開く
            </a>
            <a href={mapsDirectionsUrl(selectedPlace)} target="_blank" rel="noreferrer">
              <LocateFixed size={14} /> 現在地から
            </a>
            <a href={fullItineraryUrl()} target="_blank" rel="noreferrer">
              <Navigation size={14} /> 旅程全体
            </a>
          </div>
        </div>
      )}
    </aside>
  )
}

export default GoogleMapsDock
