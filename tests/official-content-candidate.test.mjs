import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const script = fileURLToPath(new URL('../scripts/apply-official-content-candidate.mjs', import.meta.url))
const targets = [
  'public/data/official-content.json',
  'public/data/official-content-growth.json',
  'public/release.json',
  'public/data/site-ontology.json',
]
const stages = ['discover', 'understand', 'plan', 'experience', 'check']
const item = (stage, type = 'portal') => ({
  stage, type, title: `${stage} title`, description: `${stage} details`,
  url: 'https://example.org/official', publisher: 'Official Bureau',
})
const originalRegion = (id, legacyStage, legacyType, missingStage) => {
  const items = stages.filter((s) => s !== missingStage).map((s) => item(s))
  items.push(item(legacyStage, legacyType))
  return { id, items }
}
const writeJson = (cwd, relative, data) => {
  const target = path.join(cwd, relative)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, JSON.stringify(data, null, 2) + '\n')
}
const readJson = (cwd, relative) => JSON.parse(fs.readFileSync(path.join(cwd, relative), 'utf8'))
const hashes = (cwd) => targets.map((target) =>
  crypto.createHash('sha256').update(fs.readFileSync(path.join(cwd, target))).digest('hex'))
const fixture = (t) => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'official-content-candidate-'))
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }))
  writeJson(cwd, 'candidate.json', {
    id: 'new-region', name: 'New Region', summary: 'New region overview',
    officialUrl: 'https://example.org/region', publisher: 'Official Bureau',
    items: stages.map((stage) => item(stage)),
  })
  const core = [
    originalRegion('karuizawa', 'plan', 'brochure', 'experience'),
    originalRegion('akiyoshido', 'discover', 'photo', 'check'),
    originalRegion('oirase', 'plan', 'brochure', 'check'),
    originalRegion('nobeyama', 'discover', 'regional', 'check'),
  ]
  writeJson(cwd, targets[0], { destinations: core, stages: stages.map((id) => ({ id })) })
  writeJson(cwd, 'public/data/official-content-expansion.json', { destinations: [] })
  writeJson(cwd, targets[1], { version: '2026-01-01', destinations: [] })
  writeJson(cwd, targets[2], {
    release: 'official-content-network-expanded-2026-01-01-r1',
    officialRegionCount: 4, expansionRegionCount: 0, officialContentCoverage: 20,
    officialContentStages: 5,
  })
  writeJson(cwd, targets[3], { version: '2026-01-01', navigation: { primary: ['map', 'areas', 'plans', 'live'] }, views: [] })
  return cwd
}
const run = (cwd, env = {}) => spawnSync(process.execPath, [script, 'candidate.json'], {
  cwd, encoding: 'utf8', timeout: 5000, env: { ...process.env, ...env },
})

test('rejects invalid candidate and missing canonical input without any partial write', (t) => {
  const cwd = fixture(t)
  const original = hashes(cwd)
  const candidate = readJson(cwd, 'candidate.json')
  candidate.items[4].stage = 'plan'
  writeJson(cwd, 'candidate.json', candidate)
  const invalid = run(cwd)
  assert.notEqual(invalid.status, 0)
  assert.deepEqual(hashes(cwd), original)
  assert.equal(fs.existsSync(path.join(cwd, '.official-content-transaction')), false)
  candidate.items[4].stage = 'check'
  writeJson(cwd, 'candidate.json', candidate)
  fs.rmSync(path.join(cwd, targets[3]))
  const missing = run(cwd)
  assert.notEqual(missing.status, 0)
  assert.deepEqual(targets.slice(0, 3).map((file) => fs.readFileSync(path.join(cwd, file))),
    targets.slice(0, 3).map((file) => fs.readFileSync(path.join(cwd, file))))
  assert.deepEqual(hashes(cwd).slice(0, 3), original.slice(0, 3))
})

test('rolls back byte-identically on staged and late partial-commit failures', (t) => {
  for (const point of ['prepare:1', 'prepare:4', 'commit:1', 'commit:2', 'commit:4']) {
    const cwd = fixture(t)
    const original = hashes(cwd)
    const result = run(cwd, { OFFICIAL_CONTENT_TEST_FAIL_AT: point })
    assert.notEqual(result.status, 0, `${point} must fail`)
    assert.deepEqual(hashes(cwd), original, `${point} must restore all four inputs`)
    assert.equal(fs.existsSync(path.join(cwd, '.official-content-transaction')), false)
  }
})

test('successful generation is mutually consistent and repeated input is byte-identical', (t) => {
  const cwd = fixture(t)
  const first = run(cwd)
  assert.equal(first.status, 0, first.stderr)
  const initial = hashes(cwd)
  const [core, growth, release, ontology] = targets.map((target) => readJson(cwd, target))
  assert.equal(core.destinations.length, 4)
  assert.equal(growth.destinations.length, 1)
  assert.equal(release.officialRegionCount, 5)
  assert.equal(release.expansionRegionCount, 1)
  assert.equal(release.officialContentCoverage, 25)
  assert.equal(release.latestAddedRegion, 'new-region')
  const identities = [core, growth, release, ontology].map((data) => [
    data.officialContentCandidateId, data.officialContentGeneration, data.officialContentRevision,
  ])
  assert.ok(identities.every((id) => JSON.stringify(id) === JSON.stringify(identities[0])))
  assert.equal(identities[0][0], 'new-region')
  assert.ok(/^[a-f0-9]{64}$/.test(identities[0][1]))
  const second = run(cwd)
  assert.equal(second.status, 0, second.stderr)
  assert.deepEqual(hashes(cwd), initial)
})

test('concurrent execution is rejected; killed partial commit recovers on retry', async (t) => {
  const cwd = fixture(t)
  const child = spawn(process.execPath, [script, 'candidate.json'], {
    cwd, env: { ...process.env, OFFICIAL_CONTENT_TEST_PAUSE_AT: 'commit:1' },
    stdio: 'ignore',
  })
  t.after(() => { if (child.exitCode === null) child.kill('SIGKILL') })
  const lock = path.join(cwd, '.official-content-transaction')
  const deadline = Date.now() + 4000
  while (!(fs.existsSync(path.join(lock, 'manifest.json')) && !fs.existsSync(path.join(lock, '0.next')))) {
    if (Date.now() >= deadline) throw new Error('child did not reach the injected partial commit')
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  const concurrent = run(cwd)
  assert.notEqual(concurrent.status, 0)
  assert.match(concurrent.stderr, /transaction in progress/)
  child.kill('SIGKILL')
  await new Promise((resolve) => child.once('exit', resolve))
  const resumed = run(cwd)
  assert.equal(resumed.status, 0, resumed.stderr)
  assert.equal(fs.existsSync(lock), false)
  const release = readJson(cwd, targets[2])
  assert.equal(release.officialRegionCount, 5)
  assert.equal(readJson(cwd, targets[1]).destinations.length, 1)
})

test('ambiguous stale transaction stops rather than assuming success', (t) => {
  const cwd = fixture(t)
  const original = hashes(cwd)
  const lock = path.join(cwd, '.official-content-transaction')
  fs.mkdirSync(lock)
  fs.writeFileSync(path.join(lock, 'owner.json'), JSON.stringify({ pid: 999999999 }))
  const result = run(cwd)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /UNVERIFIED/)
  assert.deepEqual(hashes(cwd), original)
})
