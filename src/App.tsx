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
import { itinerary, ontologyGroups, places, sources } from './data'
import type { ItineraryItem, Place } from './types'

const filters = [
  { id: 'car-free', label: '車なし', test: (place: Place) => place.tags.some((tag) => ['バス', '徒歩', '送迎相談', '送迎'].includes(tag)) || place.kind === 'transport' },
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

function App() {
  const [tab, setTab] = useState<'explore' | 'model'>('explore')
  const [query, setQuery] = useState('佐渡島')
  const [activeFilters, setActiveFilters] = useState(new Set(['car-free', 'verified']))
  const [selectedPlaceId, setSelectedPlaceId] = useState('futatsugame-hotel')
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const visiblePlaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return places.filter((place) => {
      const matchesQuery = !normalizedQuery || [place.name, place.area, place.description, ...place.tags]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery.replace('佐渡島', ''))
      return matchesQuery && [...activeFilters].every((id) => filters.find((filter) => filter.id === id)?.test(place))
    })
  }, [activeFilters, query])

  const selectedPlace = places.find((place) => place.id === selectedPlaceId) ?? places[0]

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
              <strong>佐渡島 · 8月お盆</strong>
              <div className="brief-grid">
                <span><CalendarDays size={16} />2泊3日</span>
                <span><BusFront size={16} />バス・送迎</span>
                <span><BedDouble size={16} />1名・1室</span>
                <span><CloudSun size={16} />海・星・温泉</span>
              </div>
              <div className="weather-note"><ThermometerSun size={17} /><span>8月の相川は平年最高 <b>29.3°C</b><small>涼しさより、海風と夜の開放感を重視</small></span></div>
            </div>
          </section>

          <section className="search-ribbon page-width" aria-label="旅行検索">
            <div className="search-field">
              <Search size={19} />
              <label>
                <span>どこへ？</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="目的地・施設を検索" />
              </label>
            </div>
            <div className="search-divider" />
            <div className="search-summary">
              <CalendarDays size={19} />
              <span><small>いつ・誰と？</small><b>8月12日 — 14日 · 1名</b></span>
            </div>
            <button className="primary-search" onClick={() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })}>
              探す <ArrowRight size={17} />
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
                <p><b>知識グラフの気づき</b>二ツ亀から相川へは、両津での乗換が旅程を決めます。</p>
              </div>
            </aside>

            <div className="discovery-column">
              <div className="section-heading">
                <div><p className="eyebrow">DISCOVER</p><h2>条件に合う場所</h2></div>
                <span>{visiblePlaces.length} 件 · 根拠あり</span>
              </div>

              <div className="atlas-card" aria-label="佐渡島の旅程マップ">
                <div className="atlas-header">
                  <span><MapPinned size={16} /> 移動関係を表示</span>
                  <div className="atlas-legend"><i className="legend-bus" />バス <i className="legend-ferry" />フェリー</div>
                </div>
                <div className="atlas-surface">
                  <svg viewBox="0 0 100 72" role="img" aria-label="二ツ亀、両津、相川を結ぶ経路">
                    <path className="island-shape" d="M77 2C90 7 91 20 82 31c-4 5-3 11-2 17 2 11-9 23-22 21-8-1-9-10-18-10-8 0-18 7-25 1-8-7-1-16 5-22 8-8 16-16 25-20C57 12 65-2 77 2Z" />
                    <path className="route-line" d="M75 12 C80 26 76 38 70 48 C58 49 44 50 27 53" />
                    <path className="ferry-line" d="M70 48 C82 52 91 55 103 57" />
                  </svg>
                  {places.slice(0, 6).map((place) => (
                    <button
                      key={place.id}
                      className={`map-node accent-${place.accent} ${selectedPlace.id === place.id ? 'selected' : ''}`}
                      style={{ left: `${place.map.x}%`, top: `${place.map.y}%` }}
                      onClick={() => setSelectedPlaceId(place.id)}
                      aria-label={`${place.name}を選択`}
                      title={place.name}
                    >
                      <span />
                      {(selectedPlace.id === place.id || ['futatsugame', 'ryotsu-port', 'aikawa'].includes(place.id)) && <b>{place.name.replace('SADO', '').replace('HOTEL ', '')}</b>}
                    </button>
                  ))}
                  <div className="map-fact"><Clock3 size={14} /><span>両津 → 二ツ亀<br /><b>65分 · 直通</b></span></div>
                </div>
              </div>

              <div className="place-grid">
                {visiblePlaces.length ? visiblePlaces.map((place) => (
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
                      <span className="evidence-row"><ShieldCheck size={14} />{place.sourceIds.length ? `${place.sourceIds.length}件の一次情報` : 'サンプルデータ'}{place.priceLabel && <em>{place.priceLabel}</em>}</span>
                    </span>
                  </button>
                )) : (
                  <div className="empty-state"><Search size={24} /><b>条件に合う場所がありません</b><span>フィルターを1つ外してみてください。</span></div>
                )}
              </div>
            </div>

            <aside className="itinerary-rail">
              <div className="itinerary-head">
                <div><p className="eyebrow">ITINERARY</p><h2>実行できる旅程</h2></div>
                <span className="feasible-badge"><Check size={13} />接続可能</span>
              </div>
              <div className="day-tabs"><button className="active">すべて</button><button>DAY 1</button><button>DAY 2</button><button>DAY 3</button></div>
              <div className="timeline">
                {itinerary.map((item, index) => {
                  const Icon = modeIcons[item.mode]
                  const dayChanged = index === 0 || itinerary[index - 1].day !== item.day
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
                <p><b>先に押さえるもの</b>二ツ亀の8月12日は残室わずか。航空券より先に、1名利用と夕食を確認。</p>
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
