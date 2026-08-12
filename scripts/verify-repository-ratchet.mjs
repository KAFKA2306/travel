import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const requiredPaths = [
  'README.md',
  'index.html',
  'planner/index.html',
  'public/data',
  'docs/canonical-flow.md',
];

for (const path of requiredPaths) {
  if (!existsSync(path)) throw new Error(`missing canonical path: ${path}`);
}

if (existsSync('.github/workflows/weekly-repo-research.yml')) {
  throw new Error('obsolete weekly repository research workflow must not return');
}

const contract = await readFile('docs/canonical-flow.md', 'utf8');
for (const token of [
  'decision_ready_candidates',
  'freshness_pass_rate',
  'manual_research_actions',
]) {
  if (!contract.includes(token)) throw new Error(`missing KPI contract: ${token}`);
}

const kpiMatches = contract.match(/^\d+\. `[^`]+`/gm) ?? [];
if (kpiMatches.length !== 3) {
  throw new Error(`repository KPI count must be exactly 3, found ${kpiMatches.length}`);
}

console.log('repository ratchet contract: PASS');
