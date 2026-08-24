import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const catalog = JSON.parse(
  await readFile(new URL('../public/data/destinations.json', import.meta.url), 'utf8'),
)

const requiredFields = [
  'id',
  'name',
  'country',
  'countryCode',
  'region',
  'scope',
  'climate',
  'tripLength',
  'duration',
  'experienceSummary',
  'gateway',
  'routeSummary',
  'bestFor',
  'publicTransportFriendly',
  'experienceTags',
  'planUrl',
  'officialUrl',
  'mediaPage',
  'publisher',
  'mediaPolicy',
]

test('destination catalog has a stable, decision-ready schema', () => {
  assert.ok(Array.isArray(catalog.destinations))
  assert.ok(catalog.destinations.length >= 14)

  const ids = new Set()
  for (const destination of catalog.destinations) {
    for (const field of requiredFields) {
      assert.ok(field in destination, `${destination.id ?? destination.name}: missing ${field}`)
    }

    assert.equal(typeof destination.id, 'string')
    assert.ok(!ids.has(destination.id), `duplicate destination id: ${destination.id}`)
    ids.add(destination.id)

    assert.ok(['国内', '海外'].includes(destination.scope), `${destination.id}: invalid scope`)
    assert.ok(['daytrip', '1-2nights', '3plus'].includes(destination.tripLength), `${destination.id}: invalid tripLength`)
    assert.equal(typeof destination.publicTransportFriendly, 'boolean')
    assert.ok(destination.experienceSummary.length >= 20, `${destination.id}: experienceSummary is too short`)
    assert.ok(destination.gateway.length >= 2, `${destination.id}: gateway is empty`)
    assert.ok(destination.routeSummary.length >= 10, `${destination.id}: routeSummary is too short`)
    assert.ok(destination.bestFor.length >= 2, `${destination.id}: bestFor is empty`)
    assert.ok(Array.isArray(destination.experienceTags) && destination.experienceTags.length >= 2, `${destination.id}: experienceTags are insufficient`)
    assert.match(destination.officialUrl, /^https:\/\//, `${destination.id}: officialUrl must use https`)
    assert.match(destination.mediaPage, /^https:\/\//, `${destination.id}: mediaPage must use https`)
    assert.match(destination.planUrl, /^\/travel\//, `${destination.id}: planUrl must stay inside Wayweave`)
  }
})

test('catalog supports domestic and international experience-first discovery', () => {
  const scopes = new Set(catalog.destinations.map((destination) => destination.scope))
  assert.deepEqual(scopes, new Set(['国内', '海外']))

  const tags = new Set(catalog.destinations.flatMap((destination) => destination.experienceTags))
  for (const expected of ['海', '川', '森', '高原', '島', '静けさ']) {
    assert.ok(tags.has(expected), `missing discovery tag: ${expected}`)
  }

  for (const expectedId of ['yakushima', 'miyakojima', 'bohol', 'batanes']) {
    assert.ok(catalog.destinations.some((destination) => destination.id === expectedId), `missing seed destination: ${expectedId}`)
  }
})

test('time-sensitive new seeds carry an explicit recheck contract', () => {
  for (const destination of catalog.destinations.filter((item) => item.checkedAt)) {
    assert.match(destination.checkedAt, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(destination.recheck?.length >= 10, `${destination.id}: missing recheck guidance`)
  }
})
