import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const candidatePath = process.argv[2]
if (!candidatePath) throw new Error('candidate path is required')

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'))


import crypto from 'node:crypto'

const canonicalFiles = [
  'public/data/official-content.json',
  'public/data/official-content-growth.json',
  'public/release.json',
  'public/data/site-ontology.json',
]
const transactionDir = path.join(root, '.official-content-transaction')
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex')
const serialized = (obj) => Buffer.from(${JSON.stringify(obj, null, 2)}\n)
const readBytes = (name) => fs.readFileSync(path.join(root, name))
const directoryEntry = (name, index, kind) => path.join(transactionDir, ${index}.${kind})
const readManifest = () => JSON.parse(fs.readFileSync(path.join(transactionDir, 'manifest.json'), 'utf8'))
const verifyBytes = (file, expected) => digest(readBytes(file)) === expected

function atomicRestore(file, backupBytes) {
  const target = path.join(root, file)
  const temporary = ${target}.restore-${process.pid}
  fs.writeFileSync(temporary, backupBytes, { flag: 'wx' })
  fs.renameSync(temporary, target)
}

function recoverPreviousTransaction() {
  if (!fs.existsSync(transactionDir)) return
  let owner
  try { owner = JSON.parse(fs.readFileSync(path.join(transactionDir, 'owner.json'), 'utf8')) }
  catch { throw new Error('UNVERIFIED: transaction owner missing; inspect before retry') }
  if (!Number.isInteger(owner.pid) || owner.pid <= 0) throw new Error('UNVERIFIED: invalid transaction owner')
  try {
    process.kill(owner.pid, 0)
    throw new Error('transaction in progress: another process owns the canonical files')
  } catch (error) {
    if (error.code !== 'ESRCH') throw error
  }
  let manifest
  try { manifest = readManifest() }
  catch { throw new Error('UNVERIFIED: incomplete transaction manifest; inspect before retry') }
  if (JSON.stringify(manifest.files) !== JSON.stringify(canonicalFiles)) {
    throw new Error('UNVERIFIED: unknown transaction file set')
  }
  const originals = manifest.files.map((file, i) => fs.readFileSync(directoryEntry(file, i, 'before')))
  if (originals.some((bytes, i) => digest(bytes) !== manifest.before[i])) {
    throw new Error('UNVERIFIED: transaction backups are corrupt')
  }
  const observed = manifest.files.map((file) => digest(readBytes(file)))
  if (observed.some((hash, i) => hash !== manifest.before[i] && hash !== manifest.after[i])) {
    throw new Error('UNVERIFIED: canonical state changed outside interrupted transaction')
  }
  // A complete, checked target generation is safe to retain. A partial generation
  // must roll back to byte-identical, previously verified inputs.
  if (!observed.every((hash, i) => hash === manifest.after[i])) {
    manifest.files.forEach((file, i) => atomicRestore(file, originals[i]))
    if (manifest.files.some((file, i) => !verifyBytes(file, manifest.before[i]))) {
      throw new Error('UNVERIFIED: rollback read-back failed')
    }
  }
  fs.rmSync(transactionDir, { recursive: true, force: true })
}

function publishCanonicalGeneration(entries) {
  // Lock before reading the prior bytes. No external consumer should treat the
  // four independently addressable JSON paths as an atomic filesystem snapshot.
  // A killed process is recovered on the next invocation, before any data load.
  fs.mkdirSync(transactionDir)
  let prepared = false
  try {
    fs.writeFileSync(path.join(transactionDir, 'owner.json'), JSON.stringify({ pid: process.pid }))
    const before = canonicalFiles.map(readBytes)
    const after = canonicalFiles.map((file) => serialized(entries.get(file)))
    const manifest = {
      files: canonicalFiles,
      before: before.map(digest),
      after: after.map(digest),
    }
    canonicalFiles.forEach((file, i) => {
      fs.writeFileSync(directoryEntry(file, i, 'before'), before[i], { flag: 'wx' })
      fs.writeFileSync(directoryEntry(file, i, 'next'), after[i], { flag: 'wx' })
      if (process.env.OFFICIAL_CONTENT_TEST_FAIL_AT === ${'prepare:' + (i + 1)}) throw new Error('injected prepare failure')
    })
    fs.writeFileSync(path.join(transactionDir, 'manifest.json'), JSON.stringify(manifest), { flag: 'wx' })
    prepared = true
    canonicalFiles.forEach((file, i) => {
      fs.renameSync(directoryEntry(file, i, 'next'), path.join(root, file))
      if (process.env.OFFICIAL_CONTENT_TEST_FAIL_AT === ${'commit:' + (i + 1)}) throw new Error('injected commit failure')
      if (process.env.OFFICIAL_CONTENT_TEST_PAUSE_AT === ${'commit:' + (i + 1)}) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20000)
      }
    })
    if (canonicalFiles.some((file, i) => !verifyBytes(file, manifest.after[i]))) {
      throw new Error('canonical read-back failed')
    }
    const actual = canonicalFiles.map((file) => JSON.parse(readBytes(file).toString('utf8')))
    const identities = actual.map((data) => [
      data.officialContentCandidateId,
      data.officialContentGeneration,
      data.officialContentRevision,
    ].join(':'))
    if (new Set(identities).size !== 1) throw new Error('canonical generation identity mismatch')
    fs.rmSync(transactionDir, { recursive: true, force: true })
  } catch (error) {
    if (prepared) {
      const manifest = readManifest()
      try {
        manifest.files.forEach((file, i) => atomicRestore(file, fs.readFileSync(directoryEntry(file, i, 'before'))))
        if (manifest.files.some((file, i) => !verifyBytes(file, manifest.before[i]))) {
          throw new Error('canonical rollback read-back failed')
        }
      } catch (rollbackError) {
        throw new Error(${'UNVERIFIED: rollback failed (' + rollbackError.message + '), original error: ' + error.message})
      }
    }
    fs.rmSync(transactionDir, { recursive: true, force: true })
    throw error
  }
}

recoverPreviousTransaction()

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

const ontology = readJson('public/data/site-ontology.json')
if (newlyAdded) {
  ontology.version = new Date().toISOString().slice(0, 10)
  ontology.principle = 'The root is a decision portal. Itineraries, destinations, official content, routes and live operational information are separate but connected layers. Official content collections grow only through validated, non-duplicate regions backed by primary sources and complete lifecycle coverage.'
}

if (release.officialRegionCount !== merged.length) throw new Error('release region count mismatch')
if (release.officialContentCoverage !== merged.length * stages.length) throw new Error('release content count mismatch')

if (!/^[a-z][a-z0-9-]*$/.test(candidate.id ?? '')) throw new Error('invalid candidate id')
if (!candidate.name?.trim() || !candidate.publisher?.trim() || !candidate.summary?.trim()) {
  throw new Error('candidate name, publisher and summary are required')
}
for (const destination of merged) {
  if (!destination.id || !destination.publisher?.trim() || !destination.officialUrl?.startsWith('https://')) {
    throw new Error(${destination.id}: invalid official source)
  }
  for (const item of destination.items) {
    if (!item.title?.trim() || !item.description?.trim() || !item.publisher?.trim()) {
      throw new Error(${destination.id}: missing official content fields)
    }
  }
}
if (release.expansionRegionCount !== expansionCount) throw new Error('release expansion count mismatch')
if (release.officialContentStages !== stages.length) throw new Error('release stage count mismatch')
if (release.latestAddedRegion !== growth.destinations.at(-1)?.id) throw new Error('release latest region mismatch')
if (!Array.isArray(ontology.views) || !Array.isArray(ontology.navigation?.primary)) {
  throw new Error('invalid site ontology')
}

const entries = new Map([
  ['public/data/official-content.json', core],
  ['public/data/official-content-growth.json', growth],
  ['public/release.json', release],
  ['public/data/site-ontology.json', ontology],
])
for (const data of entries.values()) {
  delete data.officialContentCandidateId
  delete data.officialContentGeneration
  delete data.officialContentRevision
}
const generation = digest(Buffer.from(JSON.stringify([...entries.values()])))
for (const data of entries.values()) {
  data.officialContentCandidateId = release.latestAddedRegion
  data.officialContentGeneration = generation
  data.officialContentRevision = release.release
}
publishCanonicalGeneration(entries)

console.log(`validated ${merged.length} regions / ${release.officialContentCoverage} official items${newlyAdded ? ' / candidate added' : ' / candidate already materialized'}`)
