import { access, readFile } from 'node:fs/promises'

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))

const catalog = await readJson('public/data/destinations.json')
const media = await readJson('public/data/destination-media.json')
const official = await readJson('public/data/official-content.json')
const expansion = await readJson('public/data/official-content-expansion.json')
const growth = await readJson('public/data/official-content-growth.json')
const areas = await readJson('public/data/site-areas.json')
const ontology = await readJson('public/data/site-ontology.json')
const release = await readJson('public/release.json')
const shell = await readFile('public/site-shell.js', 'utf8')
const home = await readFile('index.html', 'utf8')

if (!Array.isArray(catalog.destinations) || catalog.destinations.length === 0) {
  throw new Error('planned destinations must not be empty')
}
const destinationIds = catalog.destinations.map((item) => item.id)
const destinationIdSet = new Set(destinationIds)
if (destinationIdSet.size !== destinationIds.length) {
  throw new Error('planned destinations contain duplicate ids')
}
for (const [id, item] of Object.entries(media.destinations ?? {})) {
  if (!destinationIdSet.has(id)) throw new Error(`orphan destination media: ${id}`)
  if (item.imageUrl && !item.imageUrl.startsWith('https://')) throw new Error(`destination media must use HTTPS: ${id}`)
}

const officialRegions = [...official.destinations, ...expansion.destinations, ...growth.destinations]
const addedRegions = [...expansion.destinations, ...growth.destinations]
const officialItems = officialRegions.flatMap((destination) => destination.items)
if (!Array.isArray(official.stages) || official.stages.length !== 5) {
  throw new Error(`expected 5 lifecycle stages, got ${official.stages?.length ?? 'n/a'}`)
}
const officialIds = officialRegions.map((destination) => destination.id)
if (new Set(officialIds).size !== officialIds.length) {
  throw new Error('official content contains duplicate region ids')
}
const expectedStages = new Set(official.stages.map((stage) => stage.id))
for (const region of officialRegions) {
  if (region.items.length !== expectedStages.size) {
    throw new Error(`${region.id} must contain exactly one item per lifecycle stage`)
  }
  const stages = new Set(region.items.map((item) => item.stage))
  if (stages.size !== expectedStages.size || [...expectedStages].some((stage) => !stages.has(stage))) {
    throw new Error(`${region.id} does not cover all lifecycle stages`)
  }
  if (region.items.some((item) => !item.url.startsWith('https://'))) {
    throw new Error(`${region.id} contains a non-HTTPS source`)
  }
}
for (const region of addedRegions) {
  if (!region.officialUrl?.startsWith('https://')) {
    throw new Error(`incomplete official region: ${region.id}`)
  }
}
if (release.officialRegionCount !== officialRegions.length) throw new Error('release region count is stale')
if (release.officialContentCoverage !== officialItems.length) throw new Error('release content count is stale')
if (release.expansionRegionCount !== addedRegions.length) throw new Error('release expansion count is stale')
const latestGrowth = growth.destinations.at(-1)?.id
if (latestGrowth && release.latestAddedRegion !== latestGrowth) throw new Error('release latestAddedRegion is stale')

const expectedPrimary = ['map', 'areas', 'plans', 'live']
if (JSON.stringify(ontology.navigation?.primary) !== JSON.stringify(expectedPrimary)) {
  throw new Error('primary navigation must remain map / areas / plans / live')
}
if (!Array.isArray(ontology.views) || ontology.views.length === 0) throw new Error('site ontology has no views')
const viewIds = ontology.views.map((view) => view.id)
if (new Set(viewIds).size !== viewIds.length) throw new Error('site ontology contains duplicate view ids')
const viewById = new Map(ontology.views.map((view) => [view.id, view]))
const primaryViews = ontology.views.filter((view) => view.level <= 1).map((view) => view.id)
if (JSON.stringify(primaryViews) !== JSON.stringify(expectedPrimary)) {
  throw new Error(`unexpected top-level views: ${primaryViews.join(', ')}`)
}
for (const view of ontology.views.filter((view) => view.level >= 2)) {
  if (!view.parentId || !expectedPrimary.includes(view.parentId)) {
    throw new Error(`child view ${view.id} has no valid parentId`)
  }
}
for (const view of ontology.views) {
  if (!view.path?.startsWith('/travel/')) throw new Error(`view ${view.id} has invalid path`)
  for (const relatedId of view.relatedViewIds ?? []) {
    if (!viewById.has(relatedId)) throw new Error(`related view is unresolved: ${view.id} -> ${relatedId}`)
    if (relatedId === view.id) throw new Error(`related view points to itself: ${view.id}`)
  }
}

if (areas.areas.length < 5) throw new Error('site map must expose at least five area hubs')
if (new Set(areas.areas.map((area) => area.id)).size !== areas.areas.length) throw new Error('duplicate area hub id')
for (const area of areas.areas) {
  if (typeof area.lat !== 'number' || typeof area.lng !== 'number') throw new Error(`area ${area.id} has no map coordinate`)
  if (!area.primaryPath?.startsWith('/travel/')) throw new Error(`area ${area.id} has no internal primaryPath`)
}

if (!home.includes('id="overview-map"') || !home.includes('/travel/data/site-areas.json')) {
  throw new Error('home must start from the geographic overview map')
}
if (!shell.includes('data/site-ontology.json')) throw new Error('site shell must read the canonical site ontology')
if (!shell.includes('activePage.relatedViewIds')) throw new Error('site shell must derive related links from the canonical site ontology')
if (shell.includes('relatedRouteIds')) throw new Error('site shell must not duplicate the related-link graph')

for (const view of ontology.views) {
  const relative = view.path.slice('/travel/'.length)
  const artifact = relative ? `dist/${relative}index.html` : 'dist/index.html'
  await access(artifact).catch(() => {
    throw new Error(`Pages artifact is missing for ${view.id}: ${artifact}`)
  })
}
for (const artifact of [
  'dist/data/site-ontology.json',
  'dist/data/site-areas.json',
  'dist/data/official-content-growth.json',
  'dist/site-shell.js',
  'dist/site-shell.css',
  'dist/related-links.css',
]) {
  await access(artifact).catch(() => {
    throw new Error(`required Pages artifact is missing: ${artifact}`)
  })
}

const destinationsPage = await readFile('dist/destinations/index.html', 'utf8')
const officialPage = await readFile('dist/official/index.html', 'utf8')
if (!destinationsPage.includes('AREA DIRECTORY')) throw new Error('destination directory marker is missing')
if (!officialPage.includes('公式コンテンツ・ネットワーク')) throw new Error('official content page marker is missing')
if (!officialPage.includes('official-content-growth.json')) throw new Error('official growth data reference is missing')

console.log(JSON.stringify({
  destinations: catalog.destinations.length,
  destinationMedia: Object.keys(media.destinations ?? {}).length,
  officialRegions: officialRegions.length,
  views: ontology.views.length,
  relatedEdges: ontology.views.reduce((sum, view) => sum + (view.relatedViewIds?.length ?? 0), 0),
  pagesVerified: ontology.views.length,
}, null, 2))
