import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const ontology = JSON.parse(await readFile(new URL('../public/data/site-ontology.json', import.meta.url), 'utf8'))
const shell = await readFile(new URL('../public/site-shell.js', import.meta.url), 'utf8')
const kyushu = await readFile(new URL('../public/kyushu-2026/index.html', import.meta.url), 'utf8')
const relatedCss = await readFile(new URL('../public/related-links.css', import.meta.url), 'utf8')
const candidateWorkflow = await readFile(new URL('../.github/workflows/apply-official-content-candidate.yml', import.meta.url), 'utf8')

const byId = new Map(ontology.views.map((view) => [view.id, view]))

test('サイト構造のprimaryと関連リンクは存在するviewだけを参照する', () => {
  assert.equal(byId.size, ontology.views.length)
  for (const primaryId of ontology.navigation.primary) {
    assert.ok(byId.has(primaryId), `primary route ${primaryId} is unresolved`)
  }
  for (const view of ontology.views) {
    for (const relatedId of view.relatedViewIds ?? []) {
      assert.ok(byId.has(relatedId), `${view.id} -> ${relatedId} is unresolved`)
      assert.notEqual(relatedId, view.id)
    }
  }
})

test('九州横断・阿蘇・フェリーは相互に往復できる', () => {
  const cluster = ['kyushu-roadtrip', 'aso', 'kyushu-ferry']
  for (const source of cluster) {
    const view = byId.get(source)
    assert.ok(view, `${source} must exist`)
    const related = new Set(view.relatedViewIds)
    for (const target of cluster) {
      if (target !== source) assert.ok(related.has(target), `${source} must link to ${target}`)
    }
  }
})

test('共通shellはsite-ontology.jsonからナビと関連リンクを生成する', () => {
  assert.match(shell, /data\/site-ontology\.json/)
  assert.match(shell, /activePage\.relatedViewIds/)
  assert.match(shell, /related-links\.css/)
  assert.doesNotMatch(shell, /relatedRouteIds/)
  assert.match(shell, /related route is unresolved/)
  assert.match(relatedCss, /\.ww-related/)
})

test('現行feature pageはサイト構造JSONへ登録されている', () => {
  for (const path of ['/travel/kyushu-2026/', '/travel/aso-2026/', '/travel/kyushu-ferry-2026/', '/travel/kada-sea-daytrip-2026/']) {
    assert.ok(ontology.views.some((view) => view.path === path), `${path} is missing from site ontology`)
  }
})

test('九州ロードトリップはWayweave共通ナビへ接続する', () => {
  assert.match(kyushu, /\/travel\/site-shell\.css/)
  assert.match(kyushu, /\/travel\/site-shell\.js/)
  assert.match(kyushu, /https:\/\/kafka2306\.github\.io\/travel\/kyushu-2026\//)
})

test('公式候補workflowはautomation branch以外のPRを書き換えない', () => {
  assert.match(candidateWorkflow, /startsWith\(github\.event\.pull_request\.head\.ref, 'automation\/add-'\)/)
  assert.match(candidateWorkflow, /git push origin HEAD:/)
})
