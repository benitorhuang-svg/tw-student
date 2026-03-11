import { expect, test, type Locator, type Page } from '@playwright/test'

const taichungCountyId = '66000'
const school193667Code = '193667'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
})

async function waitForAtlasReady(page: Page) {
  await expect.poll(async () => {
    const appCount = await page.getByTestId('atlas-app').count()
    if (appCount > 0) return 'ready'

    const loadingCount = await page.getByRole('heading', { name: /正在載入台灣教育地圖與分析元件|正在載入教育部與官方行政區資料/ }).count()
    return loadingCount > 0 ? 'loading' : 'pending'
  }, { timeout: 20000 }).toBe('ready')

  await expect(page.getByTestId('atlas-app')).toBeVisible({ timeout: 20000 })
}

async function tabUntilFocused(page: Page, locator: Locator, attempts = 80) {
  for (let index = 0; index < attempts; index += 1) {
    await page.keyboard.press('Tab')
    const isFocused = await locator.evaluate((node) => node === document.activeElement)
    if (isFocused) return
  }

  throw new Error('Unable to focus target via Tab within the allowed attempts')
}

test('overview treemap exposes hover and tab-focus disclosure', async ({ page }) => {
  await page.goto('/?tab=overview')
  await waitForAtlasReady(page)

  const treemapLeaf = page.locator('.treemap-chart__leaf').first()
  await expect(treemapLeaf).toBeVisible()
  await treemapLeaf.hover({ force: true })
  await expect(page.locator('.treemap-chart__tooltip')).toBeVisible()

  await tabUntilFocused(page, treemapLeaf)
  await expect(page.locator('.treemap-chart__tooltip')).toBeVisible()
})

test('regional and school charts support keyboard disclosure and activation', async ({ page }) => {
  await page.goto('/?tab=regional')
  await waitForAtlasReady(page)

  const butterflyRow = page.locator('.butterfly-chart__row').first()
  await butterflyRow.scrollIntoViewIfNeeded()
  await butterflyRow.focus()
  await page.keyboard.press(' ')
  await expect(page.locator('.butterfly-chart__tooltip')).toBeVisible()

  await page.goto(`/?county=${encodeURIComponent(taichungCountyId)}&tab=schools&level=${encodeURIComponent('全部')}`)
  await waitForAtlasReady(page)

  const histogramBin = page.locator('.histogram-chart__bin').first()
  await histogramBin.scrollIntoViewIfNeeded()
  await histogramBin.focus()
  await page.keyboard.press(' ')
  await expect(page.locator('.histogram-chart__tooltip')).toBeVisible()

  await page.getByTestId('dashboard-search-input').fill(school193667Code)
  await expect(page.getByTestId('school-focus-panel')).toContainText(school193667Code)

  await page.locator('[aria-label="單校圖表分頁"]').getByRole('tab', { name: '規模定位' }).click()
  const prIndicatorButton = page.locator('.pr-indicator__track-button').first()
  await prIndicatorButton.scrollIntoViewIfNeeded()
  await prIndicatorButton.focus()
  await expect(page.locator('.pr-indicator__tooltip')).toBeVisible()
  await page.keyboard.press(' ')
  await expect(page.locator('.pr-indicator__tooltip')).toBeVisible()

  await page.locator('[aria-label="單校圖表分頁"]').getByRole('tab', { name: '校別概況' }).click()
  const compositionLevel = page.locator('.school-composition-chart__level').first()
  await compositionLevel.scrollIntoViewIfNeeded()
  await compositionLevel.focus()
  await page.keyboard.press(' ')
  await expect(page.locator('.school-composition-chart__tooltip')).toBeVisible()
})

test('scope panel pie chart supports hover and keyboard slice activation', async ({ page }) => {
  await page.goto('/?tab=regional')
  await waitForAtlasReady(page)

  // ScopePanel renders PieChart in the sidebar — scroll to it
  const pieWrap = page.locator('.pie-chart-wrap').first()
  await pieWrap.scrollIntoViewIfNeeded()
  await expect(pieWrap).toBeVisible({ timeout: 10000 })

  const pieSlice = pieWrap.locator('.pie-chart__slice').first()
  await expect(pieSlice).toBeVisible({ timeout: 5000 })

  // Keyboard focus reveals tooltip
  await tabUntilFocused(page, pieSlice)
  const tooltip = pieWrap.locator('.pie-chart__tooltip')
  await expect(tooltip).toBeVisible({ timeout: 5000 })

  // Space keeps tooltip visible
  await page.keyboard.press(' ')
  await expect(tooltip).toBeVisible()
})

test('narrow-width screenshots keep treemap and school overview charts readable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })

  await page.goto('/?tab=overview')
  await waitForAtlasReady(page)
  await page.locator('.treemap-chart').first().evaluate((node) => {
    const element = node as HTMLDivElement
    element.style.width = '360px'
  })
  await page.locator('.treemap-chart').first().scrollIntoViewIfNeeded()
  await expect(page.locator('.treemap-chart').first()).toHaveScreenshot('overview-treemap-narrow.png')

  await page.goto(`/?county=${encodeURIComponent(taichungCountyId)}&tab=schools&level=${encodeURIComponent('全部')}`)
  await waitForAtlasReady(page)
  await page.getByTestId('dashboard-search-input').fill(school193667Code)
  await expect(page.getByTestId('school-focus-panel')).toContainText(school193667Code)
  await page.locator('.school-overview-chart').first().evaluate((node) => {
    const element = node as HTMLDivElement
    element.style.width = '360px'
  })
  await page.locator('.school-overview-chart').first().scrollIntoViewIfNeeded()
  await expect(page.locator('.school-overview-chart').first()).toHaveScreenshot('school-overview-narrow.png')
})