import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const dataUrl = new URL('../public/data/kyushu-crossing-2026-11.json', import.meta.url)
const htmlUrl = new URL('../public/kyushu-2026/index.html', import.meta.url)
const appUrl = new URL('../public/kyushu-2026/app.js', import.meta.url)

const data = JSON.parse(await readFile(dataUrl, 'utf8'))
const html = await readFile(htmlUrl, 'utf8')
const app = await readFile(appUrl, 'utf8')

test('九州横断の正準データはレンタカー世界遺産ルートを表す', () => {
  assert.equal(data.trip_plan_issue, 45)
  assert.equal(data.travel_mode, 'rental_car_one_way')
  assert.equal(data.target_start_date, '2026-11-20')
  assert.equal(data.target_end_date, '2026-11-24')
  assert.equal(data.world_heritage.length, 3)
  assert.deepEqual(data.world_heritage.map((item) => item.name), ['万田坑', '三角西港', '天草の﨑津集落'])
  assert.equal(data.distance.status, 'PLANNED_ESTIMATE')
  assert.equal(data.distance.total_estimate_min, 621)
  assert.equal(data.distance.total_estimate_max, 671)
})

test('日別時系列は全日を持ち、最長運転日は2日目', () => {
  assert.deepEqual(data.days.map((day) => day.day), [1, 2, 3, 4, 5])
  const drivingDays = data.days.filter((day) => day.distance_estimate_max > 0)
  const longest = drivingDays.toSorted((a, b) => b.distance_estimate_max - a.distance_estimate_max)[0]
  assert.equal(longest.day, 2)
  assert.equal(longest.overnight, '黒川温泉')
})

test('視覚ページは正準JSONのみを読み、失敗を隠さない', () => {
  assert.match(html, /\.\/app\.js/)
  assert.match(app, /\.\.\/data\/kyushu-crossing-2026-11\.json/)
  assert.match(app, /旅程データを読み込めません/)
  assert.doesNotMatch(app, /fixture/i)
  assert.doesNotMatch(app, /fallback/i)
})
