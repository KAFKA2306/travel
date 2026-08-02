import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const htmlFiles = [
  'index.html',
  'planner/index.html',
  'public/guides/index.html',
  'public/shenzhen/index.html',
  'public/heat-escape-2026/index.html',
  'public/destinations/index.html',
  'public/official/index.html',
  'public/sitemap/index.html',
];
const stylesheet = '  <link rel="stylesheet" href="/travel/site-shell.css" />';
const script = '  <script src="/travel/site-shell.js" defer></script>';

for (const relativePath of htmlFiles) {
  const filePath = path.join(root, relativePath);
  let content = await readFile(filePath, 'utf8');
  const original = content;
  if (!content.includes('/travel/site-shell.css')) {
    content = content.replace('</head>', `${stylesheet}\n</head>`);
  }
  if (!content.includes('/travel/site-shell.js')) {
    content = content.replace('</body>', `${script}\n</body>`);
  }
  if (content !== original) {
    await writeFile(filePath, content, 'utf8');
    console.log(`[shell] patched ${relativePath}`);
  }
}

const readmePath = path.join(root, 'README.md');
let readme = await readFile(readmePath, 'utf8');
const before = readme;
if (!readme.includes('**Planner workspace:**')) {
  readme = readme.replace(
    '**Live site:** https://kafka2306.github.io/travel/',
    '**Decision portal:** https://kafka2306.github.io/travel/\n\n**Planner workspace:** https://kafka2306.github.io/travel/planner/'
  );
}
if (!readme.includes('**Official content network:**')) {
  readme = readme.replace(
    '**Destination atlas:** https://kafka2306.github.io/travel/destinations/',
    '**Destination atlas:** https://kafka2306.github.io/travel/destinations/\n\n**Official content network:** https://kafka2306.github.io/travel/official/'
  );
}
if (!readme.includes('planner/index.html')) {
  readme = readme.replace(
    'src/                                    Interactive reference UI and typed seed data',
    'src/                                    Interactive planner UI and typed seed data\nplanner/index.html                         Planner HTML entry for the React workspace'
  );
}
if (!readme.includes('public/official/index.html')) {
  readme = readme.replace(
    'public/destinations/index.html           Official-media destination atlas',
    'public/destinations/index.html           Official-media destination atlas\npublic/official/index.html               Official content network organized by travel lifecycle'
  );
}
if (readme !== before) {
  await writeFile(readmePath, readme, 'utf8');
  console.log('[shell] patched README.md');
}
