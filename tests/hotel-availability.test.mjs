import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { normalizeAvailability, outputPath, sourcePath } from '../scripts/build-hotel-availability.mjs'

test('generated hotel availability snapshot matches the canonical source', async () => {
  const source = JSON.parse(await readFile(sourcePath, 'utf8'))
  const generated = JSON.parse(await readFile(outputPath, 'utf8'))
  assert.deepEqual(generated, normalizeAvailability(source))
})

test('available, sold_out, and fetch_failed remain distinct states', () => {
  const normalized = normalizeAvailability({
    schema_version: 1,
    records: [
      { place_id: 'available-hotel', status: 'available', fetched_at: '2026-08-09T00:00:00Z', status_reason: 'inventory_confirmed', source_url: 'https://example.com/available' },
      { place_id: 'sold-out-hotel', status: 'sold_out', fetched_at: '2026-08-09T00:00:00Z', status_reason: 'inventory_exhausted', source_url: 'https://example.com/sold-out' },
      { place_id: 'failed-hotel', status: 'fetch_failed', fetched_at: '2026-08-09T00:00:00Z', status_reason: 'upstream_unavailable', source_url: 'https://example.com/failed' },
    ],
  })

  assert.deepEqual(new Set(normalized.records.map(({ status }) => status)), new Set(['available', 'sold_out', 'fetch_failed']))
  assert.equal(normalized.records.find(({ status }) => status === 'fetch_failed')?.status_reason, 'upstream_unavailable')
})

test('missing freshness metadata fails closed', () => {
  assert.throws(() => normalizeAvailability({
    schema_version: 1,
    records: [{ place_id: 'hotel', status: 'available', status_reason: 'inventory_confirmed', source_url: 'https://example.com' }],
  }), /invalid fetched_at/)
})
