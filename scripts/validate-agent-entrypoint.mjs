import { access, readFile, stat } from 'node:fs/promises';

const entrypoint = 'AGENTS.md';
const maxBytes = 8 * 1024;
const requiredPaths = [
  'README.md',
  'docs/ontology.md',
  'public/site-shell.js',
  'public/kyushu-ferry-2026/index.html',
  'public/aso-2026/index.html',
  'public/data',
  'scripts/capture-pages.mjs',
  '.github/workflows/ci.yml',
  '.github/workflows/deploy-pages.yml',
];
const requiredPhrases = [
  '最初の変更前に読むものは原則4つまで',
  'UNVERIFIED',
  'exact-head CI',
  'production',
  'mutableな事実を `AGENTS.md` に複製しない',
];

const info = await stat(entrypoint);
if (info.size > maxBytes) {
  throw new Error(`${entrypoint} is ${info.size} bytes; keep it <= ${maxBytes} bytes for short-context agents.`);
}

const text = await readFile(entrypoint, 'utf8');
for (const phrase of requiredPhrases) {
  if (!text.includes(phrase)) throw new Error(`${entrypoint} is missing required contract: ${phrase}`);
}

for (const path of requiredPaths) {
  await access(path);
  if (!text.includes(`\`${path}\``) && path !== 'public/data') {
    throw new Error(`${entrypoint} must route agents to ${path}`);
  }
}

console.log(`${entrypoint}: ${info.size} bytes, ${requiredPaths.length} canonical paths verified.`);
