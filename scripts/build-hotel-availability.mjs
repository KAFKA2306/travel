import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const allowedStatuses = new Set(['available', 'sold_out', 'fetch_failed'])
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const sourcePath = path.join(root, 'src/data/hotel-availability.source.json')
export const outputPath = path.join(root, 'public/data/hotel-availability.json')

export function normalizeAvailability(input) {
  if (input?.schema_version !== 1 || !Array.isArray(input.records)) {
    throw new Error('hotel availability snapshot must use schema_version=1 and contain records[]')
  }

  const seen = new Set()
  const records = input.records.map((record) => {
    if (!record?.place_id || seen.has(record.place_id)) throw new Error(`invalid or duplicate place_id: ${record?.place_id ?? '<missing>'}`)
    seen.add(record.place_id)
    if (!allowedStatuses.has(record.status)) throw new Error(`unsupported status for ${record.place_id}: ${record.status}`)
    if (!record.fetched_at || Number.isNaN(Date.parse(record.fetched_at))) throw new Error(`invalid fetched_at for ${record.place_id}`)
    if (!record.status_reason) throw new Error(`missing status_reason for ${record.place_id}`)
    if (!record.source_url?.startsWith('https://')) throw new Error(`source_url must be HTTPS for ${record.place_id}`)

    return {
      place_id: record.place_id,
      status: record.status,
      fetched_at: record.fetched_at,
      status_reason: record.status_reason,
      source_url: record.source_url,
    }
  }).sort((a, b) => a.place_id.localeCompare(b.place_id))

  return { schema_version: 1, records }
}

export async function buildAvailability() {
  const source = JSON.parse(await readFile(sourcePath, 'utf8'))
  const normalized = normalizeAvailability(source)
  await writeFile(outputPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8')
  return normalized
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildAvailability()
}
