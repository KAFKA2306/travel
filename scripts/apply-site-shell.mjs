import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const htmlFiles = [
  'index.html',
  'public/guides/index.html',
  'public/shenzhen/index.html',
  'public/heat-escape-2026/index.html',
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
if (!readme.includes('**Destination atlas:**')) {
  readme = readme.replace(
    '**Travel quick links:** https://kafka2306.github.io/travel/guides/',
    '**Travel quick links:** https://kafka2306.github.io/travel/guides/\n\n**Destination atlas:** https://kafka2306.github.io/travel/destinations/\n\n**Site ontology:** https://kafka2306.github.io/travel/sitemap/'
  );
}
if (!readme.includes('public/destinations/index.html')) {
  readme = readme.replace(
    'public/guides/index.html                Trip-specific official quick-links hub',
    'public/guides/index.html                Trip-specific official quick-links hub\npublic/destinations/index.html           Official-media destination atlas\npublic/sitemap/index.html                Ontology-driven site map\npublic/data/*.json                       Destination, media and site ontology data'
  );
}
if (readme !== before) {
  await writeFile(readmePath, readme, 'utf8');
  console.log('[shell] patched README.md');
}
