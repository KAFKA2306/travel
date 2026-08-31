import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = (process.env.SITE_URL || 'https://kafka2306.github.io/travel').replace(/\/$/, '');
const outputDir = path.resolve(process.env.SCREENSHOT_DIR || 'docs/ui-audit/latest');
const pages = [
  ['home', '/'],
  ['planner', '/planner/'],
  ['destinations', '/destinations/'],
  ['official', '/official/'],
  ['heat-escape', '/heat-escape-2026/'],
  ['kyushu-ferry', '/kyushu-ferry-2026/'],
  ['aso', '/aso-2026/'],
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

const settlePage = async (page) => {
  await page.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => {});
  await page.waitForLoadState('load', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(1_500);
  await page.evaluate(async () => {
    const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    if (document.fonts?.ready) await Promise.race([document.fonts.ready, timeout(3_000)]);

    const step = Math.max(Math.floor(window.innerHeight * 0.8), 500);
    let y = 0;
    for (let index = 0; index < 100; index += 1) {
      const maxY = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
      if (y >= maxY) {
        window.scrollTo(0, maxY);
        break;
      }
      y = Math.min(y + step, maxY);
      window.scrollTo(0, y);
      await timeout(120);
    }
    await timeout(300);

    const pending = [...document.images].filter((image) => !image.complete);
    await Promise.race([
      Promise.allSettled(pending.map((image) => new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      }))),
      timeout(8_000),
    ]);
    window.scrollTo(0, 0);
    await timeout(200);
  });
};

const verifyPlannerJourney = async (page) => {
  await page.getByLabel('保存済みの旅程モデルを選択').selectOption('arima-onsen-2026');

  const day2Button = page.getByRole('button', { name: 'DAY 2', exact: true });
  await day2Button.click();
  if (await day2Button.getAttribute('aria-pressed') !== 'true') {
    throw new Error('DAY 2 filter did not expose its selected state');
  }
  if (await page.locator('.timeline .timeline-item').count() !== 5) {
    throw new Error('DAY 2 filter did not reduce the Arima itinerary to five items');
  }
  if (await page.locator('.timeline .day-marker').count() !== 1) {
    throw new Error('DAY 2 filter rendered an unexpected number of day markers');
  }
  if (!await page.locator('.timeline .day-marker').getByText('DAY 2', { exact: true }).isVisible()) {
    throw new Error('DAY 2 filter did not render the DAY 2 marker');
  }

  await page.getByRole('button', { name: 'すべて' }).click();
  if (await page.locator('.timeline .timeline-item').count() !== 10) {
    throw new Error('All-days filter did not restore the complete Arima itinerary');
  }

  await page.getByRole('button', { name: /三ノ宮駅・三宮駅/ }).first().click();
  await page.getByRole('button', { name: 'Google Mapsを開く' }).click();
  await page.getByRole('button', { name: '三宮から', exact: true }).click();

  const mapFrame = page.locator('.google-maps-frame iframe');
  const embedAvailable = await mapFrame.count() > 0;
  let mapsApiKeyFallbackVerified = false;
  if (embedAvailable) {
    const embedSrc = await mapFrame.getAttribute('src');
    if (!embedSrc) throw new Error('Arima directions iframe is missing src');
    const embedUrl = new URL(embedSrc);
    if (!embedUrl.pathname.endsWith('/directions')) {
      throw new Error('Arima Google Maps iframe did not switch to directions mode');
    }
  } else {
    const fallback = page.locator('.google-maps-key-state');
    if (!await fallback.isVisible()) {
      throw new Error('Google Maps iframe and API-key fallback are both missing');
    }
    if (!await fallback.getByText('Google Maps APIキーを設定してください', { exact: true }).isVisible()) {
      throw new Error('Google Maps API-key fallback message is missing');
    }
    mapsApiKeyFallbackVerified = true;
  }

  const primaryHref = await page.getByRole('link', { name: '主要区間', exact: true }).getAttribute('href');
  if (!primaryHref) throw new Error('Arima primary directions link is missing');

  const url = new URL(primaryHref);
  const origin = url.searchParams.get('origin');
  const destination = url.searchParams.get('destination');
  if (!origin || !destination) throw new Error('Arima directions URL is missing origin or destination');
  if (origin === destination) throw new Error('Arima directions collapsed to the same origin and destination');
  if (!destination.includes('有馬温泉駅')) throw new Error('Arima directions from Sannomiya must target Arima Onsen Station');

  return {
    itineraryDayFilterVerified: true,
    allDaysRestoreVerified: true,
    mapsEmbedAvailable: embedAvailable,
    mapsApiKeyFallbackVerified,
    arimaDirectionsDistinct: true,
    arimaDestinationVerified: true,
  };
};

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
    const thirdPartyConsoleWarnings = [];
    const pageErrors = [];
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const text = message.text();
      if (name === 'kyushu-ferry' && text === 'Permissions policy violation: compute-pressure is not allowed in this document.') {
        thirdPartyConsoleWarnings.push(text);
        return;
      }
      consoleErrors.push(text);
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const url = `${baseUrl}${route}`;
    let response = null;
    let journeyChecks = {};
    try {
      response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await settlePage(page);
      if (name === 'planner') journeyChecks = await verifyPlannerJourney(page);
    } catch (error) {
      pageErrors.push(`navigation or journey: ${error instanceof Error ? error.message : String(error)}`);
    }

    const metrics = await page.evaluate(() => {
      const html = document.documentElement;
      const images = [...document.images];
      const brokenImages = images
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src);
      const pendingImages = images
        .filter((image) => !image.complete)
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
        pendingImages,
        unlabeledButtons,
        unlabeledLinks,
      };
    }).catch((error) => {
      pageErrors.push(`metrics: ${error instanceof Error ? error.message : String(error)}`);
      return {
        title: '', width: 0, scrollWidth: 0, height: 0, horizontalOverflow: false,
        links: 0, buttons: 0, headings: 0, brokenImages: [], pendingImages: [],
        unlabeledButtons: 0, unlabeledLinks: 0,
      };
    });

    const fileName = `${name}-${viewportName}.png`;
    await page.screenshot({ path: path.join(outputDir, fileName), fullPage: true, timeout: 60_000 });
    results.push({
      name,
      route,
      viewport: viewportName,
      screenshot: fileName,
      status: response?.status() ?? null,
      finalUrl: page.url(),
      consoleErrors,
      thirdPartyConsoleWarnings,
      pageErrors,
      journeyChecks,
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
  `| ${item.name} | ${item.viewport} | ${item.status ?? 'n/a'} | ${item.horizontalOverflow ? 'FAIL' : 'PASS'} | ${item.brokenImages.length} | ${item.pendingImages.length} | ${item.consoleErrors.length + item.pageErrors.length} | [PNG](./${item.screenshot}) |`,
).join('\n');
const failures = results.filter((item) =>
  item.horizontalOverflow
  || item.brokenImages.length
  || item.consoleErrors.length
  || item.pageErrors.length
  || item.unlabeledButtons
  || item.unlabeledLinks
  || (item.status && item.status >= 400),
);
const markdown = `# Wayweave UI audit\n\nGenerated: ${generatedAt}\n\nBase URL: ${baseUrl}\n\n| Page | Viewport | HTTP | Horizontal overflow | Broken images | Pending images | Runtime errors | Screenshot |\n|---|---|---:|---|---:|---:|---:|---|\n${rows}\n\n## Result\n\n${failures.length ? `Detected ${failures.length} audit failures. See report.json.` : 'All automated screenshot checks passed, including the Planner day filter and Arima primary-directions journey.'}\n`;
await writeFile(path.join(outputDir, 'README.md'), markdown);

if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
}
