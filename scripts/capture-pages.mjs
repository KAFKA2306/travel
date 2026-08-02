import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = (process.env.SITE_URL || 'https://kafka2306.github.io/travel').replace(/\/$/, '');
const outputDir = path.resolve(process.env.SCREENSHOT_DIR || 'docs/ui-audit/latest');
const pages = [
  ['home', '/'],
  ['planner', '/planner/'],
  ['destinations', '/destinations/'],
  ['heat-escape', '/heat-escape-2026/'],
  ['guides', '/guides/'],
  ['shenzhen', '/shenzhen/'],
  ['sitemap', '/sitemap/'],
];
const viewports = [
  ['desktop', { width: 1440, height: 1000 }],
  ['mobile', { width: 390, height: 844 }],
];

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

for (const [viewportName, viewport] of viewports) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });

  for (const [name, route] of pages) {
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const url = `${baseUrl}${route}`;
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
    await page.waitForTimeout(1500);

    await page.evaluate(async () => {
      if (document.fonts?.ready) await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 4000)),
      ]);

      const step = Math.max(360, Math.floor(window.innerHeight * 0.72));
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 90));
      }

      const pendingImages = [...document.images]
        .filter((image) => !image.complete)
        .map((image) => new Promise((resolve) => {
          const done = () => resolve(undefined);
          image.addEventListener('load', done, { once: true });
          image.addEventListener('error', done, { once: true });
          setTimeout(done, 3500);
        }));
      await Promise.all(pendingImages);
      window.scrollTo(0, 0);
      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    const metrics = await page.evaluate(() => {
      const html = document.documentElement;
      const brokenImages = [...document.images]
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src);
      const unlabeledButtons = [...document.querySelectorAll('button')]
        .filter((button) => !button.textContent?.trim() && !button.getAttribute('aria-label'))
        .length;
      const unlabeledLinks = [...document.querySelectorAll('a')]
        .filter((link) => !link.textContent?.trim() && !link.getAttribute('aria-label') && !link.querySelector('img[alt]'))
        .length;
      return {
        title: document.title,
        width: html.clientWidth,
        scrollWidth: html.scrollWidth,
        height: html.scrollHeight,
        horizontalOverflow: html.scrollWidth > html.clientWidth + 1,
        links: document.links.length,
        buttons: document.querySelectorAll('button').length,
        headings: document.querySelectorAll('h1,h2,h3').length,
        brokenImages,
        unlabeledButtons,
        unlabeledLinks,
      };
    });

    const fileName = `${name}-${viewportName}.png`;
    await page.screenshot({ path: path.join(outputDir, fileName), fullPage: true });
    results.push({
      name,
      route,
      viewport: viewportName,
      screenshot: fileName,
      status: response?.status() ?? null,
      finalUrl: page.url(),
      consoleErrors,
      pageErrors,
      ...metrics,
    });
    await page.close();
  }
  await context.close();
}

await browser.close();
const generatedAt = new Date().toISOString();
await writeFile(path.join(outputDir, 'report.json'), `${JSON.stringify({ generatedAt, baseUrl, results }, null, 2)}\n`);

const rows = results.map((item) =>
  `| ${item.name} | ${item.viewport} | ${item.status ?? 'n/a'} | ${item.horizontalOverflow ? 'FAIL' : 'PASS'} | ${item.brokenImages.length} | ${item.consoleErrors.length + item.pageErrors.length} | [PNG](./${item.screenshot}) |`,
).join('\n');
const failures = results.filter((item) => item.horizontalOverflow || item.brokenImages.length || item.consoleErrors.length || item.pageErrors.length || (item.status && item.status >= 400));
const markdown = `# Wayweave UI audit\n\nGenerated: ${generatedAt}\n\nBase URL: ${baseUrl}\n\n| Page | Viewport | HTTP | Horizontal overflow | Broken images | Runtime errors | Screenshot |\n|---|---|---:|---|---:|---:|---|\n${rows}\n\n## Result\n\n${failures.length ? `Detected ${failures.length} audit failures. See report.json.` : 'All automated screenshot checks passed.'}\n`;
await writeFile(path.join(outputDir, 'README.md'), markdown);

if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
}
