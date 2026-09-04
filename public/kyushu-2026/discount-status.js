const DISCOUNT_URL = '../data/kyushu-recovery-discount-2026.json'

function yen(value) {
  if (value == null) return '未確定'
  return new Intl.NumberFormat('ja-JP').format(value) + '円'
}

function makeLink(href, label) {
  const a = document.createElement('a')
  a.href = href
  a.target = '_blank'
  a.rel = 'noreferrer'
  a.textContent = label
  return a
}

function renderDiscountStatus(data) {
  const app = document.querySelector('#app')
  const anchor = app?.querySelector('.metric-grid')
  if (!app || !anchor || document.querySelector('#kumamoto-discount-status')) return false

  const kumamoto = data.prefecture_announcements?.['熊本県']
  const target = data.target_trip_issue_86
  if (!kumamoto || !target) return false

  const section = document.createElement('section')
  section.id = 'kumamoto-discount-status'
  section.className = 'section discount-status'
  section.setAttribute('aria-labelledby', 'kumamoto-discount-title')

  const head = document.createElement('div')
  head.className = 'section-head'
  const heading = document.createElement('h2')
  heading.id = 'kumamoto-discount-title'
  heading.textContent = '熊本60%割引'
  const headNote = document.createElement('p')
  headNote.textContent = kumamoto.booking_start ? '予約開始済み' : '予約開始未公表 · Issue #86'
  head.append(heading, headNote)

  const blocker = document.createElement('div')
  blocker.className = 'discount-blocker'
  const blockerState = document.createElement('strong')
  blockerState.textContent = kumamoto.booking_start ? 'BOOKING OPEN' : 'BLOCKED · 熊本県の公式発表待ち'
  const blockerText = document.createElement('p')
  blockerText.textContent = kumamoto.booking_start
    ? `予約開始: ${kumamoto.booking_start}`
    : '全国制度は10/1以降・熊本60%まで確定。熊本県の予約開始日、終了日、対象事業者はまだ未公表なので、応援割を前提とした予約確定はしない。'
  blocker.append(blockerState, blockerText)

  const facts = document.createElement('div')
  facts.className = 'discount-facts'
  const factItems = [
    ['割引率', '60%'],
    ['予約開始', kumamoto.booking_start || '未公表'],
    ['対象期間', `10/1以降 / 熊本県終了日は${kumamoto.eligible_stay_end || '未公表'}`],
    ['判断', target.decision === 'WAIT_FOR_OFFICIAL_BOOKING_START' ? '公式開始を待つ' : target.decision],
  ]
  for (const [label, value] of factItems) {
    const item = document.createElement('div')
    const small = document.createElement('small')
    small.textContent = label
    const strong = document.createElement('strong')
    strong.textContent = value
    item.append(small, strong)
    facts.append(item)
  }

  const cards = document.createElement('div')
  cards.className = 'discount-target-grid'
  for (const stay of target.target_stays) {
    const card = document.createElement('article')
    card.className = 'discount-target-card'
    const title = document.createElement('h3')
    title.textContent = `${stay.date.slice(5).replace('-', '/')} · ${stay.hotel}`
    const status = document.createElement('p')
    status.className = 'discount-target-status'
    status.textContent = 'UNBOOKED · 応援割対象可否 UNVERIFIED'
    const price = document.createElement('p')
    price.className = 'discount-price'
    price.textContent = `11月参考最安 ${yen(stay.reference_price_yen_2_adults)} → 単純60%参考 ${yen(stay.reference_net_yen_at_60pct)}`
    const note = document.createElement('p')
    note.textContent = stay.reference_price_scope
    const source = makeLink(stay.reference_price_source, '参考価格の出典 ↗')
    card.append(title, status, price, note, source)
    cards.append(card)
  }

  const footer = document.createElement('div')
  footer.className = 'discount-links'
  footer.append(
    makeLink(kumamoto.source_url, '観光庁の最新表 ↗'),
    makeLink('https://github.com/KAFKA2306/travel/issues/86', 'Issue #86 ↗'),
  )
  const checked = document.createElement('span')
  checked.textContent = `checked ${data.checked_at}`
  footer.append(checked)

  section.append(head, blocker, facts, cards, footer)
  anchor.before(section)
  return true
}

async function bootDiscountStatus() {
  try {
    const response = await fetch(DISCOUNT_URL, { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    if (renderDiscountStatus(data)) return

    const app = document.querySelector('#app')
    if (!app) return
    const observer = new MutationObserver(() => {
      if (renderDiscountStatus(data)) observer.disconnect()
    })
    observer.observe(app, { childList: true, subtree: true })
  } catch (error) {
    const app = document.querySelector('#app')
    const warning = document.createElement('section')
    warning.id = 'kumamoto-discount-status'
    warning.className = 'section discount-status discount-status-error'
    warning.textContent = '熊本60%割引の正準データを取得できません。観光庁の公式情報を再確認してください。'
    app?.prepend(warning)
    console.warn('discount status unavailable', error)
  }
}

bootDiscountStatus()
