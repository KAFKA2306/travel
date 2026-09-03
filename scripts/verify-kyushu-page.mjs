import { chromium } from 'playwright'

const baseUrl = (process.env.SITE_URL || 'https://kafka2306.github.io/travel').replace(/\/$/, '')
const url = `${baseUrl}/kyushu-2026/`
const ignoredThirdPartyConsoleError = 'Permissions policy violation: compute-pressure is not allowed in this document.'

function isIgnoredThirdPartyConsoleError(text) {
  return text === ignoredThirdPartyConsoleError
}

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

  await page.getByText(/PREP \/ DAY PREVIEW|TODAY|TRIP RECORD/).first().waitFor({ state: 'visible', timeout: 15_000 })
  await page.getByText('NEXT', { exact: true }).waitFor({ state: 'visible', timeout: 10_000 })
  await page.getByText('DEADLINE', { exact: true }).waitFor({ state: 'visible', timeout: 10_000 })
  await page.getByText('PLAN B', { exact: true }).waitFor({ state: 'visible', timeout: 10_000 })
  await page.getByText(/NAVIGATE · ナビ開始/).waitFor({ state: 'visible', timeout: 10_000 })
  await page.getByRole('heading', { name: /熊本から別府へ/ }).waitFor({ state: 'visible', timeout: 15_000 })
  await page.getByText('621–671', { exact: true }).waitFor({ state: 'visible', timeout: 10_000 })
  await page.getByText('万田坑', { exact: true }).first().waitFor({ state: 'visible', timeout: 10_000 })
  await page.getByText('三角西港', { exact: true }).first().waitFor({ state: 'visible', timeout: 10_000 })
  await page.getByText('天草の﨑津集落', { exact: true }).first().waitFor({ state: 'visible', timeout: 10_000 })

  // Phase 2: concrete candidates must be present while remaining explicitly unbooked.
  await page.getByRole('heading', { name: '予約・宿・返却' }).waitFor({ state: 'visible', timeout: 10_000 })
  await page.getByRole('heading', { name: 'JAL2383 ITM → KMJ' }).waitFor({ state: 'visible', timeout: 10_000 })
  for (const label of ['ホテルアレグリアガーデンズ天草', '黒川温泉 いこい旅館', 'ゆふいん山水館', 'ニッポンレンタカー', '商船三井さんふらわあ · プライベートシングル']) {
    await page.getByRole('heading', { name: label }).waitFor({ state: 'visible', timeout: 10_000 })
  }
  await page.getByText(/航空便予約 .* レンタカー予約・総額 .* 宿3泊予約 .* フェリー客室予約/).waitFor({ state: 'visible', timeout: 10_000 })

  await page.getByRole('tab', { name: /DAY 2/ }).click()
  await page.getByText(/17:00 いこい旅館 最終チェックイン/).waitFor({ state: 'visible', timeout: 10_000 })

  await page.getByRole('tab', { name: /DAY 4/ }).click()
  await page.getByText(/17:45 乗船手続き完了/).waitFor({ state: 'visible', timeout: 10_000 })

  const related = page.getByRole('navigation', { name: '関連ページ' })
  await related.waitFor({ state: 'visible', timeout: 10_000 })
  for (const label of ['阿蘇 Route Guide', '九州・さんふらわあ', '当日情報', 'エリア']) {
    await related.getByRole('link', { name: new RegExp(label) }).waitFor({ state: 'visible', timeout: 10_000 })
  }

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

  const asoPage = await context.newPage()
  const asoErrors = []
  const ignoredAsoErrors = []
  asoPage.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (isIgnoredThirdPartyConsoleError(text)) {
      ignoredAsoErrors.push(text)
      return
    }
    asoErrors.push(text)
  })
  const asoResponse = await asoPage.goto(`${baseUrl}/aso-2026/`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  if (!asoResponse || asoResponse.status() >= 400) throw new Error(`Aso page returned HTTP ${asoResponse?.status() ?? 'n/a'}`)
  const alert = asoPage.locator('.alert')
  await alert.waitFor({ state: 'visible', timeout: 15_000 })
  await asoPage.waitForTimeout(500)
  const alertText = await alert.innerText()
  if (alertText.includes('噴火警戒レベル3')) throw new Error(`legacy Aso CURRENT survived: ${alertText}`)
  if (!/噴火警戒レベル2|再確認が必要/.test(alertText)) throw new Error(`Aso freshness state is unclear: ${alertText}`)
  if (asoErrors.length) throw new Error(`Aso runtime errors: ${JSON.stringify(asoErrors)}`)
  await asoPage.close()

  console.log(JSON.stringify({
    url,
    http: response.status(),
    ...metrics,
    worldHeritageCards: 3,
    relatedLinksVerified: 4,
    executionFlowVerified: ['NEXT', 'NAVIGATE', 'DEADLINE', 'PLAN B'],
    phase2BookingCandidatesVerified: ['JAL2383', '3 stays', 'Nippon Rent-A-Car', 'Sunflower private single'],
    phase2BookingStateVerified: 'UNBOOKED',
    asoLegacyCurrentRemoved: true,
    ignoredThirdPartyConsoleErrors: ignoredAsoErrors,
  }, null, 2))
} finally {
  await context.close()
  await browser.close()
}
