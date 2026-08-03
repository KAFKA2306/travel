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

const all = datasets.flatMap(({ data }) => data.destinations)
if (all.some((item) => item.id === candidate.id)) throw new Error(`duplicate region id: ${candidate.id}`)
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
growth.destinations.push(candidate)
growth.version = new Date().toISOString().slice(0, 10)
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
release.release = `official-content-network-expanded-${new Date().toISOString().slice(0, 10)}-r${Number((release.release.match(/-r(\d+)$/) || [])[1] || 0) + 1}`
release.publishedAt = new Date().toISOString()
release.officialRegionCount = merged.length
release.expansionRegionCount = expansionCount
release.officialContentCoverage = merged.reduce((sum, destination) => sum + destination.items.length, 0)
release.officialContentStages = stages.length
release.latestAddedRegion = candidate.id
writeJson('public/release.json', release)

const ontology = readJson('public/data/site-ontology.json')
ontology.version = new Date().toISOString().slice(0, 10)
ontology.principle = 'The root is a decision portal. Itineraries, destinations, official content, routes and live operational information are separate but connected layers. Official content collections grow only through validated, non-duplicate regions backed by primary sources and complete lifecycle coverage.'
writeJson('public/data/site-ontology.json', ontology)

if (release.officialRegionCount !== merged.length) throw new Error('release region count mismatch')
if (release.officialContentCoverage !== merged.length * stages.length) throw new Error('release content count mismatch')
console.log(`validated ${merged.length} regions / ${release.officialContentCoverage} official items`)
