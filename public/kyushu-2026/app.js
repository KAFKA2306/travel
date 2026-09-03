const DATA_URL = '../data/kyushu-crossing-2026-11.json'
const app = document.querySelector('#app')

const maxDayDistance = 250

const typeLabel = {
  world_heritage: 'WH',
  scenic: 'VIEW',
  ferry: 'SEA',
  car: 'DRIVE',
  stay: 'STAY',
  culture: 'CULT',
  city: 'CITY',
  walk: 'WALK',
  flight: 'AIR',
  arrival: 'ARR',
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function formatDate(iso) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(`${iso}T00:00:00+09:00`))
}

function routeClass(name, heritageNames) {
  if (heritageNames.has(name)) return 'heritage'
  if (['大観峰', '草千里ヶ浜', '阿蘇神社'].includes(name)) return 'scenic'
  if (name === '大阪') return 'ferry'
  return ''
}

function dayDistanceLabel(day) {
  if (!day.distance_estimate_max) return '移動なし'
  if (day.distance_estimate_min === day.distance_estimate_max) return `${day.distance_estimate_min} km`
  return `${day.distance_estimate_min}–${day.distance_estimate_max} km`
}

function statusClass(value) {
  return value === 'CONFIRMED' ? 'ok' : 'warn'
}

function render(data) {
  const heritageNames = new Set(data.world_heritage.map((item) => item.name))
  const drivingDays = data.days.filter((day) => day.distance_estimate_max > 0)
  const routeNodes = data.route.map((name, index) => {
    const cssClass = routeClass(name, heritageNames)
    return `
      <div class="route-node ${cssClass}">
        <i>${String(index + 1).padStart(2, '0')}</i>
        <b>${escapeHtml(name)}</b>
        <small>${heritageNames.has(name) ? 'WORLD HERITAGE' : index === 0 ? 'START' : index === data.route.length - 1 ? 'GOAL' : 'ROUTE'}</small>
      </div>`
  }).join('')

  const dayCards = drivingDays.map((day) => {
    const midpoint = (day.distance_estimate_min + day.distance_estimate_max) / 2
    const width = Math.min(100, Math.max(4, midpoint / maxDayDistance * 100))
    const stops = day.stops.map((stop) => `
      <li class="${stop.type === 'world_heritage' ? 'heritage-stop' : ''}">
        <time>${escapeHtml(stop.time)}</time>
        <strong>${escapeHtml(stop.name)}</strong>
      </li>`).join('')

    return `
      <article class="day-card" data-day="${day.day}">
        <div class="day-top">
          <div>
            <span class="day-number">DAY ${day.day}</span>
            <h3 class="day-title">${escapeHtml(day.label)}</h3>
            <span class="day-date">${escapeHtml(formatDate(day.date))} · ${escapeHtml(day.overnight ?? '')}</span>
          </div>
          <span class="distance-pill">${escapeHtml(dayDistanceLabel(day))}</span>
        </div>
        <div class="distance-bar" title="日別の予定走行距離"><span style="width:${width.toFixed(1)}%"></span></div>
        <ol class="timeline">${stops}</ol>
      </article>`
  }).join('')

  const heritageCards = data.world_heritage.map((item, index) => `
    <article class="heritage-card">
      <span class="heritage-index">WORLD HERITAGE ${String(index + 1).padStart(2, '0')}</span>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.property)}<br>${escapeHtml(item.city)} · ${escapeHtml(formatDate(item.planned_date))}</p>
      <a href="${escapeHtml(item.official_url)}" target="_blank" rel="noreferrer">公式情報を開く ↗</a>
    </article>`).join('')

  const checks = [
    ['フェリー時刻', data.verification.ferry_schedule],
    ['大阪→熊本 航空便', data.verification.flight],
    ['レンタカー車種・乗捨料金', data.verification.rental_car_exact_vehicle_and_one_way_fee],
    ['正確な実走行距離', data.verification.exact_driving_distance],
    ['阿蘇火山アクセス', data.verification.aso_volcanic_access],
  ]

  const checkRows = checks.map(([label, value]) => {
    const confirmed = value === 'CONFIRMED'
    return `<li><span>${escapeHtml(label)}</span><code class="${statusClass(confirmed ? 'CONFIRMED' : value)}">${escapeHtml(value)}</code></li>`
  }).join('')

  const sourceRows = data.primary_sources.map((source) => `
    <li>
      <span>${escapeHtml(source.publisher)} · ${escapeHtml(source.subject)}</span>
      <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">開く ↗</a>
    </li>`).join('')

  app.innerHTML = `
    <section class="hero">
      <div>
        <p class="kicker">WORLD HERITAGE ROAD TRIP / 2026.11.20–24</p>
        <h1>熊本から別府へ。<br><em>世界遺産3件</em>と阿蘇をつなぐ。</h1>
        <p class="hero-copy">${escapeHtml(data.summary)}</p>
      </div>
      <aside class="hero-panel">
        <strong>${escapeHtml(data.title)}</strong>
        <p>往復しない。熊本県北から天草へ下り、阿蘇を横断して大分へ抜ける。最後は別府からフェリーで大阪へ戻る。</p>
        <div class="action-row">
          <a class="action-link primary" href="https://www.google.com/maps/dir/?api=1&origin=%E9%98%BF%E8%98%87%E3%81%8F%E3%81%BE%E3%82%82%E3%81%A8%E7%A9%BA%E6%B8%AF&destination=%E5%88%A5%E5%BA%9C%E9%A7%85&waypoints=%E4%B8%87%E7%94%B0%E5%9D%91%7C%E4%B8%89%E8%A7%92%E8%A5%BF%E6%B8%AF%7C%E5%B4%8E%E6%B4%A5%E9%9B%86%E8%90%BD%7C%E9%BB%92%E5%B7%9D%E6%B8%A9%E6%B3%89%7C%E5%A4%A7%E8%A6%B3%E5%B3%B0%7C%E8%8D%89%E5%8D%83%E9%87%8C%E3%83%B6%E6%B5%9C%7C%E7%94%B1%E5%B8%83%E9%99%A2" target="_blank" rel="noreferrer">Google Mapsで概略ルート ↗</a>
        </div>
      </aside>
    </section>

    <section class="metric-grid" aria-label="旅の主要指標">
      <div class="metric"><small>DRIVING</small><b>${data.distance.total_estimate_min}–${data.distance.total_estimate_max}</b><span>km · 計画値</span></div>
      <div class="metric"><small>WORLD HERITAGE</small><b>${data.world_heritage.length}</b><span>構成資産</span></div>
      <div class="metric"><small>DRIVING DAYS</small><b>${drivingDays.length}</b><span>日 · ワンウェイ</span></div>
      <div class="metric"><small>FINISH</small><b>18:45</b><span>11/23 別府発</span></div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>一本線で見る全行程</h2>
        <p>地図ではなく、旅の進行方向を優先した順路図。</p>
      </div>
      <div class="route-board"><div class="route-track">${routeNodes}</div></div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>日別の移動負荷</h2>
        <p>棒の長さは予定走行距離。2日目が最長。</p>
      </div>
      <div class="day-grid">${dayCards}</div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>世界遺産 3件</h2>
        <p>阿蘇自体は世界遺産ではない。世界遺産3構成資産＋阿蘇。</p>
      </div>
      <div class="heritage-grid">${heritageCards}</div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>予約前に残っている確認</h2>
        <p>未確認値は未確認のまま表示する。</p>
      </div>
      <div class="status-board">
        <div>
          <h3>Verification</h3>
          <ul class="status-list">${checkRows}</ul>
        </div>
        <div>
          <h3>Primary sources</h3>
          <ul class="status-list">${sourceRows}</ul>
        </div>
      </div>
      <p class="data-note">DATA: ${escapeHtml(DATA_URL)} · checked ${escapeHtml(data.checked_at)} · 距離は ${escapeHtml(data.distance.status)}。正準JSON以外のfixture / fallbackは使用していません。</p>
    </section>`
}

async function boot() {
  try {
    const response = await fetch(DATA_URL, { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    render(data)
  } catch (error) {
    app.innerHTML = `<section class="fatal-error"><strong>旅程データを読み込めません。</strong><p>${escapeHtml(error instanceof Error ? error.message : String(error))}</p><p>${escapeHtml(DATA_URL)} を確認してください。</p></section>`
    console.error(error)
  }
}

boot()
