const DATA_URL = '../data/kyushu-crossing-2026-11.json'
const app = document.querySelector('#app')

const maxDayDistance = 250
let selectedDayNumber = null
let tripData = null

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
    timeZone: 'Asia/Tokyo',
  }).format(new Date(`${iso}T00:00:00+09:00`))
}

function todayInJapan() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).format(new Date())
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
  return value === 'CONFIRMED' || String(value).startsWith('VERIFIED') ? 'ok' : 'warn'
}

function tripPhase(data) {
  const today = todayInJapan()
  if (today < data.target_start_date) return 'PREP'
  if (today > data.target_end_date) return 'COMPLETE'
  return 'ACTIVE'
}

function initialDay(data) {
  const today = todayInJapan()
  const match = data.days.find((day) => day.date === today)
  return match?.day ?? 1
}

function freshness(status) {
  if (!status || status.status !== 'VERIFIED' || !status.valid_until) {
    return { fresh: false, label: '要再確認' }
  }
  const fresh = new Date(status.valid_until).getTime() > Date.now()
  return { fresh, label: fresh ? 'CURRENT' : '情報が古い' }
}

function renderExecution(data) {
  const day = data.days.find((item) => item.day === selectedDayNumber) || data.days[0]
  const phase = tripPhase(data)
  const volcanoFreshness = freshness(data.live_status?.volcano)
  const nextNav = day.stops.find((stop) => stop.navigation_url)?.navigation_url
  const unresolved = [
    data.verification.flight === 'UNVERIFIED' ? '航空便' : null,
    data.verification.rental_car_exact_vehicle_and_one_way_fee === 'UNVERIFIED' ? 'レンタカー' : null,
    data.verification.stays === 'UNVERIFIED' ? '宿3泊' : null,
    data.verification.ferry_booking === 'UNVERIFIED' ? 'フェリー予約' : null,
  ].filter(Boolean)

  return `
    <section class="execution-shell" aria-label="旅行実行画面">
      <div class="execution-topline">
        <div>
          <p class="execution-kicker">${phase === 'ACTIVE' ? 'TODAY' : phase === 'PREP' ? 'PREP / DAY PREVIEW' : 'TRIP RECORD'}</p>
          <h1>${escapeHtml(day.execution?.next || day.label)}</h1>
        </div>
        <span class="execution-date">DAY ${day.day} · ${escapeHtml(formatDate(day.date))}</span>
      </div>

      <div class="day-switcher" role="tablist" aria-label="日付を切り替える">
        ${data.days.map((item) => `<button type="button" class="day-switch${item.day === day.day ? ' active' : ''}" data-day="${item.day}" role="tab" aria-selected="${item.day === day.day}">DAY ${item.day}<small>${escapeHtml(formatDate(item.date))}</small></button>`).join('')}
      </div>

      <div class="execution-grid">
        <article class="execution-card next-card">
          <span class="execution-label">NEXT</span>
          <strong>${escapeHtml(day.execution?.next || '未設定')}</strong>
          <dl>
            <div><dt>現在 / 出発</dt><dd>${escapeHtml(day.execution?.start || '未設定')} · ${escapeHtml(day.execution?.planned_start || '—')}</dd></div>
            <div><dt>到着目安</dt><dd>${escapeHtml(day.execution?.next_arrival || '—')}</dd></div>
            <div><dt>今日の距離</dt><dd>${escapeHtml(dayDistanceLabel(day))}</dd></div>
          </dl>
          ${nextNav ? `<a class="execution-action" href="${escapeHtml(nextNav)}" target="_blank" rel="noreferrer">NAVIGATE · ナビ開始 ↗</a>` : '<span class="execution-action disabled">NAVIGATE · 目的地未確定</span>'}
        </article>

        <article class="execution-card deadline-card">
          <span class="execution-label">DEADLINE</span>
          <strong>${escapeHtml(day.execution?.hard_deadline || '固定締切なし')}</strong>
          <p>次の固定締切を守るために、観光を延ばしすぎない。</p>
        </article>

        <article class="execution-card planb-card">
          <span class="execution-label">PLAN B</span>
          <strong>遅延・規制時</strong>
          <p>${escapeHtml(day.execution?.plan_b || '当日情報を確認して判断する。')}</p>
        </article>

        <article class="execution-card live-card ${volcanoFreshness.fresh ? 'fresh' : 'stale'}">
          <div class="live-heading"><span class="execution-label">LIVE · ASO</span><span class="freshness-badge">${escapeHtml(volcanoFreshness.label)}</span></div>
          <strong>${volcanoFreshness.fresh ? escapeHtml(data.live_status.volcano.label) : '阿蘇火山情報を再確認'}</strong>
          <p>${volcanoFreshness.fresh ? escapeHtml(data.live_status.volcano.summary) : '保存済み情報の有効期限を超えています。古い状態をCURRENTとして表示しません。'}</p>
          <div class="live-links">
            <a href="${escapeHtml(data.live_status.volcano.source_url)}" target="_blank" rel="noreferrer">気象庁 ↗</a>
            <a href="${escapeHtml(data.live_status.volcano.local_source_url)}" target="_blank" rel="noreferrer">阿蘇市 ↗</a>
          </div>
        </article>
      </div>

      ${unresolved.length ? `<div class="unresolved-strip"><b>予約前に未確定:</b> ${unresolved.map(escapeHtml).join(' / ')}。確定していない値は旅行実行情報として扱いません。</div>` : ''}

      <div class="day-runbook">
        <div class="section-head compact"><h2>この日の時系列</h2><p>ナビできる地点はその場から開けます。</p></div>
        <ol class="runbook-list">
          ${day.stops.map((stop) => `
            <li>
              <time>${escapeHtml(stop.time)}</time>
              <div><strong>${escapeHtml(stop.name)}</strong><small>${escapeHtml(stop.status)}</small></div>
              ${stop.navigation_url ? `<a href="${escapeHtml(stop.navigation_url)}" target="_blank" rel="noreferrer">ナビ ↗</a>` : '<span></span>'}
            </li>`).join('')}
        </ol>
      </div>
    </section>`
}

function render(data) {
  tripData = data
  if (selectedDayNumber == null) selectedDayNumber = initialDay(data)
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
      <div class="heritage-ops">
        <span>${escapeHtml(item.opening_hours)}</span>
        ${item.last_entry ? `<span>最終入場 ${escapeHtml(item.last_entry)}</span>` : ''}
        <span>滞在目安 ${escapeHtml(item.visit_minutes)}分</span>
        <span>${escapeHtml(item.parking)}</span>
      </div>
      <a href="${escapeHtml(item.official_url)}" target="_blank" rel="noreferrer">公式情報を開く ↗</a>
    </article>`).join('')

  const checks = [
    ['フェリー時刻', data.verification.ferry_schedule],
    ['フェリー予約', data.verification.ferry_booking],
    ['大阪→熊本 航空便', data.verification.flight],
    ['レンタカー車種・乗捨料金', data.verification.rental_car_exact_vehicle_and_one_way_fee],
    ['宿3泊', data.verification.stays],
    ['正確な実走行距離', data.verification.exact_driving_distance],
    ['阿蘇火山アクセス', data.verification.aso_volcanic_access],
  ]

  const checkRows = checks.map(([label, value]) => `<li><span>${escapeHtml(label)}</span><code class="${statusClass(value)}">${escapeHtml(value)}</code></li>`).join('')

  const sourceRows = data.primary_sources.map((source) => `
    <li>
      <span>${escapeHtml(source.publisher)} · ${escapeHtml(source.subject)}</span>
      <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">開く ↗</a>
    </li>`).join('')

  app.innerHTML = `
    ${renderExecution(data)}

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
      <div class="metric"><small>FERRY</small><b>18:45</b><span>11/23 別府発 / 手続17:45まで</span></div>
    </section>

    <section class="section">
      <div class="section-head"><h2>一本線で見る全行程</h2><p>地図ではなく、旅の進行方向を優先した順路図。</p></div>
      <div class="route-board"><div class="route-track">${routeNodes}</div></div>
    </section>

    <section class="section">
      <div class="section-head"><h2>日別の移動負荷</h2><p>棒の長さは予定走行距離。2日目が最長。</p></div>
      <div class="day-grid">${dayCards}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2>世界遺産 3件</h2><p>営業時間・駐車も同じカードで見る。</p></div>
      <div class="heritage-grid">${heritageCards}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2>予約前に残っている確認</h2><p>未確認値は未確認のまま表示する。</p></div>
      <div class="status-board">
        <div><h3>Verification</h3><ul class="status-list">${checkRows}</ul></div>
        <div><h3>Primary sources</h3><ul class="status-list">${sourceRows}</ul></div>
      </div>
      <p class="data-note">DATA: ${escapeHtml(DATA_URL)} · checked ${escapeHtml(data.checked_at)} · 距離は ${escapeHtml(data.distance.status)}。正準JSON以外の代替データは使用していません。</p>
    </section>`

  app.querySelectorAll('[data-day]').forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return
    button.addEventListener('click', () => {
      selectedDayNumber = Number(button.dataset.day)
      render(tripData)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  })
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
