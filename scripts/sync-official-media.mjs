import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'public/data/destinations.json');
const outputPath = path.join(root, 'public/data/destination-media.json');
const userAgent = 'WayweaveOfficialMediaBot/1.0 (+https://kafka2306.github.io/travel/sitemap/)';

const decodeHtml = (value = '') => value
  .replaceAll('&amp;', '&')
  .replaceAll('&quot;', '"')
  .replaceAll('&#039;', "'")
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>');

const parseAttributes = (tag) => {
  const attributes = {};
  const pattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;
  while ((match = pattern.exec(tag))) {
    attributes[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
};

const resolveUrl = (value, baseUrl) => {
  if (!value || value.startsWith('data:')) return null;
  try {
    const resolved = new URL(value, baseUrl);
    if (!['http:', 'https:'].includes(resolved.protocol)) return null;
    return resolved.href;
  } catch {
    return null;
  }
};

const extractOfficialImage = (html, baseUrl, destinationName) => {
  const metaCandidates = [];
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = parseAttributes(match[0]);
    const key = (attrs.property || attrs.name || attrs.itemprop || '').toLowerCase();
    if (['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src', 'image'].includes(key)) {
      metaCandidates.push(attrs.content);
    }
  }

  for (const candidate of metaCandidates) {
    const resolved = resolveUrl(candidate, baseUrl);
    if (resolved && !/\.(svg)(?:$|\?)/i.test(resolved)) return resolved;
  }

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = parseAttributes(match[0]);
    if ((attrs.rel || '').toLowerCase().split(/\s+/).includes('image_src')) {
      const resolved = resolveUrl(attrs.href, baseUrl);
      if (resolved) return resolved;
    }
  }

  const scored = [];
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const attrs = parseAttributes(match[0]);
    const source = attrs.src || attrs['data-src'] || attrs['data-lazy-src'] || attrs['data-original'];
    const resolved = resolveUrl(source, baseUrl);
    if (!resolved || /(?:logo|icon|sprite|favicon|loading|spinner)/i.test(resolved) || /\.svg(?:$|\?)/i.test(resolved)) continue;
    const description = `${attrs.alt || ''} ${attrs.class || ''} ${attrs.id || ''}`;
    let score = 0;
    if ((attrs.alt || '').includes(destinationName)) score += 8;
    if (/(?:hero|visual|keyvisual|key-visual|mainvisual|main-visual|\bmv\b|\bkv\b)/i.test(description)) score += 5;
    if (/(?:hero|visual|main|cover|slide)/i.test(resolved)) score += 3;
    const width = Number(attrs.width || 0);
    const height = Number(attrs.height || 0);
    if (width >= 600 || height >= 400) score += 2;
    scored.push({ resolved, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.resolved || null;
};

const fetchHtml = async (url) => {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(25000),
    headers: {
      'user-agent': userAgent,
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'ja,en;q=0.8',
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    throw new Error(`unexpected content type: ${contentType}`);
  }
  return { html: await response.text(), finalUrl: response.url };
};

const today = new Date().toISOString().slice(0, 10);
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
let existing = { destinations: {} };
try {
  existing = JSON.parse(await readFile(outputPath, 'utf8'));
} catch {
  // First generation.
}

const generated = {};
for (const destination of catalog.destinations) {
  const previous = existing.destinations?.[destination.id] || {};
  let imageUrl = destination.overrideImageUrl || null;
  let sourceUrl = destination.mediaPage || destination.officialUrl;
  let status = imageUrl ? 'verified' : 'unavailable';

  if (!imageUrl) {
    try {
      const { html, finalUrl } = await fetchHtml(destination.mediaPage || destination.officialUrl);
      sourceUrl = finalUrl;
      imageUrl = extractOfficialImage(html, finalUrl, destination.name);
      status = imageUrl ? 'verified' : 'unavailable';
    } catch (error) {
      imageUrl = previous.imageUrl || null;
      sourceUrl = previous.sourceUrl || sourceUrl;
      status = imageUrl ? 'stale' : 'unavailable';
      console.warn(`[media] ${destination.id}: ${error.message}`);
    }
  }

  const unchanged = imageUrl === previous.imageUrl && sourceUrl === previous.sourceUrl && status === previous.status;
  generated[destination.id] = {
    imageUrl,
    sourceUrl,
    publisher: destination.publisher,
    mode: destination.mediaPolicy,
    status,
    verifiedAt: unchanged ? (previous.verifiedAt || null) : (imageUrl ? today : null),
    licenseUrl: destination.licenseUrl || null,
    licenseNote: destination.licenseNote,
    imageHost: imageUrl ? new URL(imageUrl).host : null,
  };
}

const output = {
  version: catalog.version,
  generatedBy: 'scripts/sync-official-media.mjs',
  policy: 'remote-official-preview-first; no automatic local rehosting',
  destinations: generated,
};
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`[media] wrote ${Object.keys(generated).length} destination records`);
