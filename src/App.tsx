import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BedDouble,
  BusFront,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  CloudSun,
  Database,
  ExternalLink,
  Filter,
  Footprints,
  MapPinned,
  Menu,
  Plane,
  Route,
  Search,
  ShieldCheck,
  Ship,
  Sparkles,
  ThermometerSun,
  X,
} from 'lucide-react'
import GoogleMapsDock from './GoogleMapsDock'
import TripAtlas from './TripAtlas'
import { arimaItinerary, itinerary, ontologyGroups, places, sources, tripCatalog } from './data'
import hotelAvailability from './data/hotel-availability.source.json'
import type { ItineraryItem, Place } from './types'

type HotelAvailabilityStatus = 'available' | 'sold_out' | 'fetch_failed'
type HotelAvailabilityRecord = {
  place_id: string
  status: HotelAvailabilityStatus
  fetched_at: string
  status_reason: string
  source_url: string
}

const hotelAvailabilityByPlace = new Map(
  (hotelAvailability.records as HotelAvailabilityRecord[]).map((record) => [record.place_id, record]),
)

const availabilityLabel: Record<HotelAvailabilityStatus, string> = {
  available: '空室あり',
  sold_out: '満室',
  fetch_failed: '取得失敗',
}

const formatAvailabilityTime = (value: string) => new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(new Date(value))

const filters = [
  { id: 'car-free', label: '車なし', test: (place: Place) => place.tags.some((tag) => ['バス', '徒歩', '送迎相談', '送迎', '鉄道', '車なし'].includes(tag)) || place.kind === 'transport' },
  { id: 'sea', label: '海が見える', test: (place: Place) => place.tags.includes('海') || place.tags.includes('夕陽') },
  { id: 'onsen', label: '温泉', test: (place: Place) => place.tags.includes('温泉') },
  { id: 'quiet', label: '静けさ', test: (place: Place) => place.tags.includes('静けさ') || place.tags.includes('星空') },
  { id: 'verified', label: '一次情報あり', test: (place: Place) => place.sourceIds.length > 0 },
]

const modeIcons: Record<ItineraryItem['mode'], typeof BusFront> = {
  flight: Plane,
  ferry: Ship,
  bus: BusFront,
  stay: BedDouble,
  walk: Footprints,
}

const isPlaceInTrip = (place: Place, tripId: string) => place.tripId ? place.tripId === tripId : tripId === 'sado-summer-2026'

function App() {
  const [tab, setTab] = useState<'explore' | 'model'>('explore')
  const [selectedTripId, setSelectedTripId] = useState('sado-summer-2026')
  const [activeFilters, setActiveFilters] = useState(new Set(['car-free', 'verified']))
  const [selectedPlaceId, setSelectedPlaceId] = useState('futatsugame-hotel')
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<'all' | 1 | 2 | 3>('all')

  const selectedTrip = tripCatalog.find((trip) => trip.id === selectedTripId) ?? tripCatalog[0]
  const isArimaBudgetTrip = selectedTripId === 'arima-onsen-2026'
  const tripBrief = isArimaBudgetTrip
    ? { transport: '鉄道・日帰り移動', theme: '予算・温泉・街歩き', note: '有馬六彩2連泊を外し、三宮2泊＋金の湯800円へ変更' }
    : { transport: 'バス・送迎', theme: '海・星・温泉', note: '8月の相川は平年最高 29.3°C。海風と夜の開放感を重視' }
  const activeItinerary = isArimaBudgetTrip ? arimaItinerary : itinerary
  const visibleItinerary = selectedDay === 'all'
    ? activeItinerary
    : activeItinerary.filter((item) => item.day === selectedDay)
  const railInsight = isArimaBudgetTrip
    ? '宿泊と温泉を分離し、三宮で2連泊。有馬六彩は高価格帯の比較候補として残します。'
    : '二ツ亀から相川へは、両津での乗換が旅程を決めます。'
  const decisionAlert = isArimaBudgetTrip
    ? '三宮の2泊料金を先に比較。有馬は日帰りにし、金の湯はお盆を含む繁忙日800円で利用します。'
    : '二ツ亀の8月12日は残室わずか。航空券より先に、1名利用と夕食を確認。'

  const visiblePlaces = useMemo(() => places.filter((place) => (
    isPlaceInTrip(place, selectedTripId)
    && [...activeFilters].every((id) => filters.find((filter) => filter.id === id)?.test(place))
  )), [activeFilters, selectedTripId])

  const selectedPlace = places.find((place) => place.id === selectedPlaceId && isPlaceInTrip(place, selectedTripId)) ?? visiblePlaces[0] ?? places[0]

  const selectTrip = (tripId: string) => {
    setSelectedTripId(tripId)
    setSelectedDay('all')
    const firstPlace = places.find((place) => isPlaceInTrip(place, tripId))
    if (firstPlace) setSelectedPlaceId(firstPlace.id)
  }

  const toggleFilter = (id: string) => {
    setActiveFilters((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setTab('explore')} aria-label="Wayweave ホーム">
          <span className="brand-mark"><Route size={20} strokeWidth={2.2} /></span>
          <span>wayweave</span>
        </button>

        <nav className={menuOpen ? 'nav-links is-open' : 'nav-links'} aria-label="メインナビゲーション">
          <button className={tab === 'explore' ? 'active' : ''} onClick={() => { setTab('explore'); setMenuOpen(false) }}>旅を組む</button>
          <button className={tab === 'model' ? 'active' : ''} onClick={() => { setTab('model'); setMenuOpen(false) }}>知識モデル</button>
          <a href="https://github.com/KAFKA2306/travel" target="_blank" rel="noreferrer">GitHub <ExternalLink size={13} /></a>
        </nav>

        <div className="top-actions">
          <button className="source-button" onClick={() => setSourcesOpen(true)}>
            <ShieldCheck size={16} /> {sources.length} sources
          </button>
          <button className="menu-button" onClick={() => setMenuOpen((open) => !open)} aria-label="メニューを開く" title="メニュー">
            <Menu size={20} />
          </button>
        </div>
      </header>

      {tab === 'explore' ? (
        <main>
          <section className="hero page-width">
            <div>
              <p className="eyebrow"><Sparkles size={14} /> TRAVEL KNOWLEDGE, MADE USABLE</p>
              <h1>行きたいを、<br /><em>行ける旅</em>に変える。</h1>
              <p className="hero-copy">場所だけでなく、時刻・空室・移動制約・根拠まで。<br />散らばった旅行データを、ひとつの判断画面へ。</p>
            </div>
            <div className="trip-brief-card">
              <span className="card-kicker">今回の旅の条件</span>
              <strong>{selectedTrip.label}</strong>
              <div className="brief-grid">
                <span><CalendarDays size={16} />{selectedTrip.dateLabel}</span>
                <span><BusFront size={16} />{tripBrief.transport}</span>
                <span><BedDouble size={16} />{selectedTrip.party}</span>
                <span><CloudSun size={16} />{tripBrief.theme}</span>
              </div>
              <div className="weather-note"><ThermometerSun size={17} /><span>{tripBrief.note}<small>保存済みの旅程モデルから選択中</small></span></div>
            </div>
          </section>

          <section className="search-ribbon page-width" aria-label="旅程モデル選択">
            <div className="search-field">
              <MapPinned size={19} />
              <label>
                <span>旅程モデルを選択</span>
                <select value={selectedTripId} onChange={(event) => selectTrip(event.target.value)} aria-label="保存済みの旅程モデルを選択">
                  {tripCatalog.map((trip) => <option key={trip.id} value={trip.id}>{trip.label}</option>)}
                </select>
              </label>
            </div>
            <div className="search-divider" />
            <div className="search-summary">
              <CalendarDays size={19} />
              <span><small>いつ・誰と？</small><b>8月12日 — 14日 · 1名</b></span>
            </div>
            <button className="primary-search" onClick={() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })}>
              旅程を確認 <ArrowRight size={17} />
            </button>
          </section>

          <section className="workspace page-width" id="results">
            <aside className="filter-rail">
              <div className="rail-heading"><span><Filter size={16} /> 絞り込み</span><button onClick={() => setActiveFilters(new Set())}>リセット</button></div>
              <div className="filter-list">
                {filters.map((filter) => (
                  <label key={filter.id} className="filter-row">
                    <input type="checkbox" checked={activeFilters.has(filter.id)} onChange={() => toggleFilter(filter.id)} />
                    <span className="fake-check">{activeFilters.has(filter.id) && <Check size={13} />}</span>
                    {filter.label}
                  </label>
                ))}
              </div>
              <div className="rail-divider" />
              <p className="rail-label">移動の優先度</p>
              <div className="priority-card">
                <span className="priority-icon"><BusFront size={18} /></span>
                <div><b>乗換の確実さ</b><small>終バスと送迎条件を優先</small></div>
              </div>
              <div className="rail-insight">
                <Sparkles size={17} />
                <p><b>知識グラフの気づき</b>{railInsight}</p>
              </div>
            </aside>

            <div className="discovery-column">
              <div className="section-heading">
                <div><p className="eyebrow">DISCOVER</p><h2>条件に合う場所</h2></div>
                <span>{visiblePlaces.length} 件 · 根拠あり</span>
              </div>

              <TripAtlas
                tripId={selectedTripId}
                destination={selectedTrip.destination}
                selectedPlaceId={selectedPlace.id}
                onSelectPlace={setSelectedPlaceId}
              />

              <div className="place-grid">
                {visiblePlaces.length ? visiblePlaces.map((place) => {
                  const availability = hotelAvailabilityByPlace.get(place.id)
                  return (
                    <button key={place.id} className={`place-card ${selectedPlace.id === place.id ? 'selected' : ''}`} onClick={() => setSelectedPlaceId(place.id)}>
                      <span className={`place-visual accent-${place.accent}`}>
                        {place.kind === 'stay' ? <BedDouble size={26} /> : place.kind === 'transport' ? <Ship size={26} /> : <MapPinned size={26} />}
                        <small>{place.eyebrow}</small>
                      </span>
                      <span className="place-body">
                        <span className="place-title-row"><b>{place.name}</b><ChevronRight size={17} /></span>
                        <span className="place-area">{place.area}</span>
                        <span className="place-description">{place.description}</span>
                        <span className="tag-row">{place.tags.slice(0, 3).map((tag) => <i key={tag}>{tag}</i>)}</span>
                        <span className="evidence-row"><ShieldCheck size={14} />{place.sourceIds.length ? `${place.sourceIds.length}件の一次情報` : 'サンプルデータ'}{place.priceLabel && !availability && <em>{place.priceLabel}</em>}</span>
                        {availability && (
                          <span className="evidence-row" data-availability-status={availability.status} title={availability.status_reason}>
                            <Clock3 size={14} />
                            {availabilityLabel[availability.status]} · 取得 {formatAvailabilityTime(availability.fetched_at)}
                            <em>{availability.status === 'fetch_failed' ? '空室判定不能' : availability.status === 'sold_out' ? '在庫なし' : '在庫確認済み'}</em>
                          </span>
                        )}
                      </span>
                    </button>
                  )
                }) : (
                  <div className="empty-state"><Search size={24} /><b>条件に合う場所がありません</b><span>選択中の旅程モデルのフィルターを1つ外してみてください。</span></div>
                )}
              </div>
            </div>

            <aside className="itinerary-rail">
              <div className="itinerary-head">
                <div><p className="eyebrow">ITINERARY</p><h2>実行できる旅程</h2></div>
                <span className="feasible-badge"><Check size={13} />接続可能</span>
              </div>
              <div className="day-tabs" aria-label="表示する日">
                {(['all', 1, 2, 3] as const).map((day) => (
                  <button
                    key={day}
                    className={selectedDay === day ? 'active' : ''}
                    onClick={() => setSelectedDay(day)}
                    aria-pressed={selectedDay === day}
                  >
                    {day === 'all' ? 'すべて' : `DAY ${day}`}
                  </button>
                ))}
              </div>
              <div className="timeline">
                {visibleItinerary.map((item, index) => {
                  const Icon = modeIcons[item.mode]
                  const dayChanged = index === 0 || visibleItinerary[index - 1].day !== item.day
                  return (
                    <div key={item.id}>
                      {dayChanged && <div className="day-marker"><span>DAY {item.day}</span><small>{item.day === 1 ? '8月12日（水）' : item.day === 2 ? '8月13日（木）' : '8月14日（金）'}</small></div>}
                      <button className={`timeline-item status-${item.status}`} onClick={() => item.placeId && setSelectedPlaceId(item.placeId)}>
                        <time>{item.time}</time>
                        <span className="timeline-icon"><Icon size={15} /></span>
                        <span className="timeline-copy"><b>{item.title}</b><small>{item.meta}</small></span>
                      </button>
                    </div>
                  )
                })}
              </div>
              <div className="decision-alert">
                <span><CircleDot size={16} /></span>
                <p><b>先に押さえるもの</b>{decisionAlert}</p>
              </div>
              <button className="outline-button" onClick={() => setSourcesOpen(true)}>根拠と更新日を見る <ArrowRight size={16} /></button>
            </aside>
          </section>
        </main>
      ) : (
        <ModelView onOpenSources={() => setSourcesOpen(true)} />
      )}

      <footer className="footer page-width">
        <span><b>wayweave</b> · travel knowledge reference architecture</span>
        <span>PostgreSQL + PostGIS · GTFS · Schema.org · PROV-O</span>
      </footer>

      {tab === 'explore' && <GoogleMapsDock tripId={selectedTripId} selectedPlace={selectedPlace.name} />}
      {sourcesOpen && <SourceDrawer onClose={() => setSourcesOpen(false)} />}
    </div>
  )
}

function ModelView({ onOpenSources }: { onOpenSources: () => void }) {
  return (
    <main className="model-page page-width">
      <section className="model-hero">
        <div>
          <p className="eyebrow"><Database size={14} /> GENERAL TRAVEL ONTOLOGY</p>
          <h1>旅行データを、<br /><em>5つの意味</em>で整理する。</h1>
        </div>
        <p>施設・交通・旅程を別々の表で終わらせず、「どの根拠が、いつまで有効か」まで結びます。UIとAPIが同じ意味を共有できる、実用優先のオントロジーです。</p>
      </section>

      <section className="model-layout">
        <div className="ontology-panel">
          <div className="panel-title"><span><Route size={18} /> Concept map</span><small>標準語彙にマッピング可能</small></div>
          <div className="ontology-grid">
            {ontologyGroups.map((group, index) => (
              <article key={group.name} className={`ontology-card accent-${group.color} ${index === 4 ? 'wide' : ''}`}>
                <div className="ontology-card-head"><span>{String(index + 1).padStart(2, '0')}</span><h2>{group.name}</h2></div>
                <p>{group.description}</p>
                <div>{group.entities.map((entity) => <code key={entity}>{entity}</code>)}</div>
                <small>→ {group.connectsTo.join(' · ')}</small>
              </article>
            ))}
          </div>
        </div>

        <aside className="architecture-panel">
          <div className="panel-title"><span><Database size={18} /> Data stack</span></div>
          <ol className="stack-list">
            <li><span className="stack-number">01</span><div><b>PostgreSQL</b><small>正規化された業務データの正本</small></div><em>Core</em></li>
            <li><span className="stack-number">02</span><div><b>PostGIS</b><small>地点・範囲・近傍・経路の空間索引</small></div><em>Geo</em></li>
            <li><span className="stack-number">03</span><div><b>Range partitions</b><small>価格・空室・観測を月単位で分割</small></div><em>Scale</em></li>
            <li><span className="stack-number">04</span><div><b>Parquet exports</b><small>分析と大量配布は列指向ファイルへ</small></div><em>Analytics</em></li>
          </ol>
          <div className="rule-card">
            <ShieldCheck size={19} />
            <div><b>設計ルール</b><p>JSONBは拡張属性だけ。検索・結合・整合性が必要な中核項目は列と外部キーで守る。</p></div>
          </div>
          <button className="outline-button" onClick={onOpenSources}>参照した標準を見る <ArrowRight size={16} /></button>
        </aside>
      </section>

      <section className="flow-section">
        <div><p className="eyebrow">ONE PIPELINE</p><h2>取り込みから意思決定まで</h2></div>
        <div className="flow-row">
          <span><small>INGEST</small><b>公式・GTFS・宿</b></span><ChevronRight />
          <span><small>NORMALIZE</small><b>外部IDを統合</b></span><ChevronRight />
          <span><small>PROVE</small><b>出典と有効期間</b></span><ChevronRight />
          <span><small>PLAN</small><b>制約を評価</b></span><ChevronRight />
          <span><small>EXPLAIN</small><b>UIに理由を表示</b></span>
        </div>
      </section>
    </main>
  )
}

function SourceDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="source-drawer" role="dialog" aria-modal="true" aria-labelledby="source-title">
        <div className="drawer-head"><div><p className="eyebrow">PROVENANCE</p><h2 id="source-title">根拠と更新日</h2></div><button onClick={onClose} aria-label="閉じる" title="閉じる"><X size={20} /></button></div>
        <p className="drawer-intro">表示中の判断に使った一次情報です。旅行データは必ず「取得日」と「有効期間」を分けて保存します。</p>
        <div className="source-list">
          {sources.map((source) => (
            <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
              <span className={`source-kind kind-${source.kind}`}>{source.kind === 'official' ? 'OFFICIAL' : source.kind === 'climate' ? 'CLIMATE' : 'STANDARD'}</span>
              <b>{source.label}</b>
              <small>{source.publisher} · 取得 {source.retrievedAt}</small>
              <ExternalLink size={16} />
            </a>
          ))}
        </div>
        <div className="drawer-note"><Clock3 size={17} /><p><b>鮮度ルール</b>空室・価格は24時間、時刻表は改正日、施設属性は90日を目安に再確認します。</p></div>
      </aside>
    </div>
  )
}

export default App