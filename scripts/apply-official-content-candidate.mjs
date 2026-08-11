import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const candidatePath = process.argv[2]
if (!candidatePath) throw new Error('candidate path is required')

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'))
const writeJson = (p, value) => fs.writeFileSync(path.join(root, p), `${JSON.stringify(value, null, 2)}\n`)

const sourceFiles = [
  'public/data/official-content.json',
  'public/data/official-content-expansion.json',
  'public/data/official-content-growth.json',
]
const stages = ['discover', 'understand', 'plan', 'experience', 'check']
const candidate = readJson(candidatePath)
const datasets = sourceFiles.map((file) => ({ file, data: readJson(file) }))

const core = datasets.find(({ file }) => file.endsWith('official-content.json')).data
const replaceLegacyItem = (destinationId, expectedStage, expectedType, replacement) => {
  const destination = core.destinations.find((item) => item.id === destinationId)
  if (!destination) throw new Error(`legacy repair destination missing: ${destinationId}`)
  const alreadyRepaired = destination.items.some(
    (item) => JSON.stringify(item) === JSON.stringify(replacement),
  )
  if (alreadyRepaired) return
  const index = destination.items.findIndex(
    (item) => item.stage === expectedStage && item.type === expectedType,
  )
  if (index < 0) throw new Error(`legacy repair target changed: ${destinationId}/${expectedStage}/${expectedType}`)
  destination.items[index] = replacement
}

replaceLegacyItem('karuizawa', 'plan', 'brochure', {
  stage: 'experience',
  type: 'eco-tourism',
  title: '軽井沢エコツーリズム',
  description: '自然、歴史・文化、スポーツを切り口に、軽井沢の伝統と文化に触れる公式体験プログラムを選ぶ。',
  url: 'https://karuizawa-kankokyokai.jp/eco_tourism/',
  publisher: '軽井沢観光協会',
})
replaceLegacyItem('akiyoshido', 'discover', 'photo', {
  stage: 'check',
  type: 'live-operations',
  title: '秋芳洞 営業・アクセス情報',
  description: '受付時間、繁忙期の営業時間、休業日、アクセス、料金を訪問直前に公式案内で確認する。',
  url: 'https://yamaguchi-tourism.jp/spot/detail_14475.html',
  publisher: '山口県観光連盟',
})
replaceLegacyItem('oirase', 'plan', 'brochure', {
  stage: 'check',
  type: 'live-operations',
  title: '青森県観光のお知らせ',
  description: '道路・遊歩道の通行規制、交通、天候に伴う運用変更など、奥入瀬訪問前の更新を公式情報で確認する。',
  url: 'https://aomori-tourism.com/topics/index.html',
  publisher: '青森県観光国際交流機構',
})
replaceLegacyItem('nobeyama', 'discover', 'regional', {
  stage: 'check',
  type: 'live-operations',
  title: '野辺山宇宙電波観測所 見学情報',
  description: '自由見学の時間、気象警報時の休止、アクセス、電波機器の利用注意を訪問直前に公式案内で確認する。',
  url: 'https://www.nro.nao.ac.jp/visit/',
  publisher: '国立天文台 野辺山宇宙電波観測所',
})
writeJson('public/data/official-content.json', core)

const all = datasets.flatMap(({ data }) => data.destinations)
const existing = all.find((item) => item.id === candidate.id)
if (existing && JSON.stringify(existing) !== JSON.stringify(candidate)) {
  throw new Error(`region id collision with different content: ${candidate.id}`)
}
const newlyAdded = !existing
if (!Array.isArray(candidate.items) || candidate.items.length !== 5) throw new Error('candidate must contain exactly five items')
const candidateStages = candidate.items.map((item) => item.stage).sort()
if (JSON.stringify(candidateStages) !== JSON.stringify([...stages].sort())) throw new Error('candidate must contain each lifecycle stage exactly once')

for (const item of candidate.items) {
  if (!item.url?.startsWith('https://')) throw new Error(`non-HTTPS item URL: ${item.url}`)
  if (!item.publisher?.trim()) throw new Error('publisher is required')
  if (!item.description?.trim()) throw new Error('description is required')
}
if (!candidate.officialUrl?.startsWith('https://')) throw new Error('officialUrl must use HTTPS')

const growth = datasets.find(({ file }) => file.endsWith('official-content-growth.json')).data
if (newlyAdded) {
  growth.destinations.push(candidate)
  growth.version = new Date().toISOString().slice(0, 10)
}
writeJson('public/data/official-content-growth.json', growth)

const merged = datasets.flatMap(({ file, data }) => file.endsWith('official-content-growth.json') ? growth.destinations : data.destinations)
const ids = merged.map((item) => item.id)
if (new Set(ids).size !== ids.length) throw new Error('region IDs are not unique')
for (const destination of merged) {
  if (!Array.isArray(destination.items) || destination.items.length !== 5) throw new Error(`${destination.id}: expected five items`)
  const found = destination.items.map((item) => item.stage).sort()
  if (JSON.stringify(found) !== JSON.stringify([...stages].sort())) throw new Error(`${destination.id}: lifecycle stages are incomplete`)
  for (const item of destination.items) if (!item.url?.startsWith('https://')) throw new Error(`${destination.id}: non-HTTPS URL`)
}

const release = readJson('public/release.json')
const baseCount = datasets[0].data.destinations.length
const expansionCount = merged.length - baseCount
if (newlyAdded) {
  release.release = `official-content-network-expanded-${new Date().toISOString().slice(0, 10)}-r${Number((release.release.match(/-r(\d+)$/) || [])[1] || 0) + 1}`
  release.publishedAt = new Date().toISOString()
  release.officialRegionCount = merged.length
  release.expansionRegionCount = expansionCount
  release.officialContentCoverage = merged.reduce((sum, destination) => sum + destination.items.length, 0)
  release.officialContentStages = stages.length
  release.latestAddedRegion = candidate.id
}
writeJson('public/release.json', release)

const ontology = readJson('public/data/site-ontology.json')
if (newlyAdded) {
  ontology.version = new Date().toISOString().slice(0, 10)
  ontology.principle = 'The root is a decision portal. Itineraries, destinations, official content, routes and live operational information are separate but connected layers. Official content collections grow only through validated, non-duplicate regions backed by primary sources and complete lifecycle coverage.'
}
writeJson('public/data/site-ontology.json', ontology)

if (release.officialRegionCount !== merged.length) throw new Error('release region count mismatch')
if (release.officialContentCoverage !== merged.length * stages.length) throw new Error('release content count mismatch')
console.log(`validated ${merged.length} regions / ${release.officialContentCoverage} official items${newlyAdded ? ' / candidate added' : ' / candidate already materialized'}`)
