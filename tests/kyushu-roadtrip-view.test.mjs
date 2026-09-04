import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const dataUrl = new URL('../public/data/kyushu-crossing-2026-11.json', import.meta.url)
const htmlUrl = new URL('../public/kyushu-2026/index.html', import.meta.url)
const appUrl = new URL('../public/kyushu-2026/app.js', import.meta.url)
const shellUrl = new URL('../public/site-shell.js', import.meta.url)
const discountUiUrl = new URL('../public/kyushu-2026/discount-status.js', import.meta.url)
const verifierUrl = new URL('../scripts/verify-kyushu-page.mjs', import.meta.url)

const data = JSON.parse(await readFile(dataUrl, 'utf8'))
const html = await readFile(htmlUrl, 'utf8')
const app = await readFile(appUrl, 'utf8')
const shell = await readFile(shellUrl, 'utf8')
const discountUi = await readFile(discountUiUrl, 'utf8')
const verifier = await readFile(verifierUrl, 'utf8')

test('九州横断の正準データはレンタカー世界遺産ルートを表す', () => {
  assert.equal(data.trip_plan_issue, 45)
  assert.equal(data.execution_issue, 82)
  assert.equal(data.travel_mode, 'rental_car_one_way')
  assert.equal(data.target_start_date, '2026-11-20')
  assert.equal(data.target_end_date, '2026-11-24')
  assert.equal(data.world_heritage.length, 3)
  assert.deepEqual(data.world_heritage.map((item) => item.name), ['万田坑', '三角西港', '天草の﨑津集落'])
  assert.equal(data.distance.status, 'PLANNED_ESTIMATE')
  assert.equal(data.distance.total_estimate_min, 621)
  assert.equal(data.distance.total_estimate_max, 671)
})

test('日別時系列は実行情報を持ち、最長運転日は2日目', () => {
  assert.deepEqual(data.days.map((day) => day.day), [1, 2, 3, 4, 5])
  const drivingDays = data.days.filter((day) => day.distance_estimate_max > 0)
  const longest = drivingDays.toSorted((a, b) => b.distance_estimate_max - a.distance_estimate_max)[0]
  assert.equal(longest.day, 2)
  assert.equal(longest.overnight, '黒川温泉')
  for (const day of data.days) {
    assert.ok(day.execution?.next)
    assert.ok(day.execution?.plan_b)
  }
  for (const day of data.days.slice(0, 4)) assert.ok(day.execution.hard_deadline)
})

test('主要地点はナビと実行情報を正準データから取得できる', () => {
  const navStops = data.days.flatMap((day) => day.stops).filter((stop) => stop.navigation_url)
  assert.ok(navStops.length >= 12)
  assert.ok(navStops.every((stop) => stop.navigation_url.startsWith('https://www.google.com/maps/dir/')))
  const [manda, misumi, sakitsu] = data.world_heritage
  assert.equal(manda.last_entry, '16:30')
  assert.equal(manda.parking_status, 'VERIFIED')
  assert.equal(misumi.parking_status, 'VERIFIED')
  assert.equal(sakitsu.parking_status, 'VERIFIED')
  assert.match(sakitsu.parking, /ガイダンスセンター/)
})

test('阿蘇火山情報は有効期限を持ち、古いCURRENTへの復帰を禁止する', () => {
  const volcano = data.live_status.volcano
  assert.equal(volcano.status, 'VERIFIED')
  assert.ok(new Date(volcano.valid_until) > new Date(volcano.checked_at))
  assert.match(volcano.source_url, /jma\.go\.jp/)
  assert.match(volcano.local_source_url, /city\.aso\.kumamoto\.jp/)
  assert.match(shell, /KYUSHU_STATUS_URL/)
  assert.match(shell, /STATUS · STALE/)
  assert.match(shell, /有効期限を超えています/)
  assert.match(shell, /古い値には戻しません/)
})

test('航空便は時刻表確認と予約状態を分離する', () => {
  assert.equal(data.flight.flight_number, 'JAL2383')
  assert.equal(data.flight.departure, '07:25')
  assert.equal(data.flight.arrival, '08:40')
  assert.equal(data.flight.booking_status, 'UNBOOKED')
  assert.equal(data.flight.status, 'VERIFIED_SCHEDULE_UNBOOKED')
  assert.match(data.flight.official_url, /jal\.co\.jp/)
  assert.equal(data.days[0].execution.planned_start, '09:30')
})

test('宿3泊は具体名と実行情報を持つが未予約を維持する', () => {
  assert.deepEqual(data.stays.map((stay) => stay.hotel), ['ホテルアレグリアガーデンズ天草', '黒川温泉 いこい旅館', 'ゆふいん山水館'])
  for (const stay of data.stays) {
    assert.equal(stay.booking_status, 'UNBOOKED')
    assert.ok(stay.address)
    assert.ok(stay.phone)
    assert.ok(stay.parking)
    assert.ok(stay.final_checkin)
    assert.match(stay.official_url, /^https:\/\//)
  }
  assert.equal(data.stays[1].final_checkin, '17:00')
  assert.match(data.stays[1].cancellation_policy, /7日前30%/)
  assert.equal(data.stays[2].final_checkin, '19:00')
  assert.match(data.stays[2].cancellation_policy, /8–14日前10%/)
})

test('レンタカーは受取・返却営業所を確定し、総額未確定を隠さない', () => {
  assert.equal(data.rental_car.provider, 'ニッポンレンタカー')
  assert.equal(data.rental_car.pickup.office, '熊本空港営業所')
  assert.equal(data.rental_car.pickup.planned_time, '09:30')
  assert.equal(data.rental_car.return.office, '別府観光港前営業所')
  assert.equal(data.rental_car.return.planned_time, '15:00')
  assert.match(data.rental_car.return.terminal_access, /徒歩約13分/)
  assert.match(data.rental_car.one_way_fee_rule, /10kmごとに.*1,100円/)
  assert.equal(data.rental_car.exact_one_way_fee, null)
  assert.equal(data.rental_car.booking_status, 'UNBOOKED')
})

test('フェリーは出港時刻だけでなく予約開始・客室候補・手続き締切を保持する', () => {
  assert.equal(data.ferry.departure, '2026-11-23T18:45:00+09:00')
  assert.equal(data.ferry.checkin_start, '16:15')
  assert.equal(data.ferry.boarding_start, '17:45')
  assert.equal(data.ferry.walk_on_checkin_deadline, '17:45')
  assert.equal(data.ferry.reservation_opened_at, '2026-08-23T09:00:00+09:00')
  assert.equal(data.ferry.room_candidate, 'プライベートシングル')
  assert.equal(data.ferry.booking_status, 'UNBOOKED')
  assert.equal(data.ferry.exact_fare, null)
})

test('実行画面は予約候補と予約済みを混同せず正準JSONのみを読む', () => {
  assert.match(html, /\.\/app\.js/)
  assert.match(html, /\.\/execution\.css/)
  assert.match(html, /\.\/discount-status\.css/)
  assert.match(html, /\.\/discount-status\.js/)
  assert.match(app, /\.\.\/data\/kyushu-crossing-2026-11\.json/)
  assert.match(app, /PREP \/ DAY PREVIEW/)
  assert.match(app, /NAVIGATE/)
  assert.match(app, /DEADLINE/)
  assert.match(app, /PLAN B/)
  assert.match(app, /予約・宿・返却/)
  assert.match(app, /候補や時刻が確認済みでも、予約完了とは扱いません/)
  assert.match(app, /旅程データを読み込めません/)
  assert.doesNotMatch(app, /fixture/i)
  assert.match(discountUi, /熊本60%割引/)
  assert.match(discountUi, /予約開始未公表/)
  assert.match(discountUi, /Issue #86/)
})

test('本番監査はPhase2を検証し、既知の第三者compute-pressure警告だけを限定除外する', () => {
  assert.match(verifier, /JAL2383 ITM → KMJ/)
  assert.match(verifier, /ホテルアレグリアガーデンズ天草/)
  assert.match(verifier, /17:00 いこい旅館 最終チェックイン/)
  assert.match(verifier, /商船三井さんふらわあ · プライベートシングル/)
  assert.match(verifier, /Permissions policy violation: compute-pressure is not allowed in this document\./)
  assert.match(verifier, /text === ignoredThirdPartyConsoleError/)
  assert.match(verifier, /if \(asoErrors\.length\) throw new Error/)
})
