import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const ontology = JSON.parse(await readFile(new URL('../public/data/site-ontology.json', import.meta.url), 'utf8'))
const shell = await readFile(new URL('../public/site-shell.js', import.meta.url), 'utf8')
const kyushu = await readFile(new URL('../public/kyushu-2026/index.html', import.meta.url), 'utf8')
const relatedCss = await readFile(new URL('../public/related-links.css', import.meta.url), 'utf8')

const byId = new Map(ontology.views.map((view) => [view.id, view]))

test('サイト構造の関連リンクは存在するviewだけを参照する', () => {
  assert.equal(byId.size, ontology.views.length)
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
    const related = new Set(byId.get(source).relatedViewIds)
    for (const target of cluster) {
      if (target !== source) assert.ok(related.has(target), `${source} must link to ${target}`)
    }
  }
})

test('共通shellは現行の主要feature pageを認識する', () => {
  for (const path of ['/kyushu-2026/', '/aso-2026/', '/kyushu-ferry-2026/', '/kada-sea-daytrip-2026/']) {
    assert.match(shell, new RegExp(path.replaceAll('/', '\\/')))
  }
  assert.match(shell, /relatedRouteIds/)
  assert.match(shell, /related-links\.css/)
  assert.match(relatedCss, /\.ww-related/)
})

test('九州ロードトリップはWayweave共通ナビへ接続する', () => {
  assert.match(kyushu, /\/travel\/site-shell\.css/)
  assert.match(kyushu, /\/travel\/site-shell\.js/)
  assert.match(kyushu, /https:\/\/kafka2306\.github\.io\/travel\/kyushu-2026\//)
})
