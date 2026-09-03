import { chromium } from 'playwright'

const baseUrl = (process.env.SITE_URL || 'https://kafka2306.github.io/travel').replace(/\/$/, '')
const url = `${baseUrl}/kyushu-2026/`

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: 'light',
  reducedMotion: 'reduce',
})
const page = await context.newPage()
const consoleErrors = []
const pageErrors = []
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
page.on('pageerror', (error) => pageErrors.push(error.message))

try {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  if (!response || response.status() >= 400) {
    throw new Error(`Kyushu page returned HTTP ${response?.status() ?? 'n/a'}`)
  }

  await page.getByRole('heading', { name: /熊本から別府へ/ }).waitFor({ state: 'visible', timeout: 15_000 })
  await page.getByText('621–671', { exact: true }).waitFor({ state: 'visible', timeout: 10_000 })
  await page.getByText('万田坑', { exact: true }).first().waitFor({ state: 'visible', timeout: 10_000 })
  await page.getByText('三角西港', { exact: true }).first().waitFor({ state: 'visible', timeout: 10_000 })
  await page.getByText('天草の﨑津集落', { exact: true }).first().waitFor({ state: 'visible', timeout: 10_000 })

  const metrics = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    title: document.title,
  }))

  if (metrics.scrollWidth > metrics.width + 1) {
    throw new Error(`horizontal overflow: ${metrics.scrollWidth} > ${metrics.width}`)
  }
  if (consoleErrors.length || pageErrors.length) {
    throw new Error(`runtime errors: ${JSON.stringify({ consoleErrors, pageErrors })}`)
  }

  console.log(JSON.stringify({ url, http: response.status(), ...metrics, worldHeritageCards: 3 }, null, 2))
} finally {
  await context.close()
  await browser.close()
}
