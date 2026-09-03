import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const dataUrl = new URL('../public/data/kyushu-crossing-2026-11.json', import.meta.url)
const htmlUrl = new URL('../public/kyushu-2026/index.html', import.meta.url)
const appUrl = new URL('../public/kyushu-2026/app.js', import.meta.url)
const shellUrl = new URL('../public/site-shell.js', import.meta.url)

const data = JSON.parse(await readFile(dataUrl, 'utf8'))
const html = await readFile(htmlUrl, 'utf8')
const app = await readFile(appUrl, 'utf8')
const shell = await readFile(shellUrl, 'utf8')

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
  for (const day of data.days.slice(0, 4)) {
    assert.ok(day.execution.hard_deadline)
  }
})

test('主要地点はナビと実行情報を正準データから取得できる', () => {
  const navStops = data.days.flatMap((day) => day.stops).filter((stop) => stop.navigation_url)
  assert.ok(navStops.length >= 10)
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
  assert.match(shell, /古い値には戻しません/)
  assert.match(shell, /情報が古い/)
})

test('フェリーは出港時刻ではなく手続き締切まで保持する', () => {
  assert.equal(data.ferry.departure, '2026-11-23T18:45:00+09:00')
  assert.equal(data.ferry.checkin_start, '16:15')
  assert.equal(data.ferry.boarding_start, '17:45')
  assert.equal(data.ferry.walk_on_checkin_deadline, '17:45')
  assert.equal(data.ferry.booking_status, 'UNVERIFIED')
})

test('実行画面は正準JSONのみを読み、失敗を隠さない', () => {
  assert.match(html, /\.\/app\.js/)
  assert.match(html, /\.\/execution\.css/)
  assert.match(app, /\.\.\/data\/kyushu-crossing-2026-11\.json/)
  assert.match(app, /PREP \/ DAY PREVIEW/)
  assert.match(app, /NAVIGATE/)
  assert.match(app, /DEADLINE/)
  assert.match(app, /PLAN B/)
  assert.match(app, /旅程データを読み込めません/)
  assert.doesNotMatch(app, /fixture/i)
})
