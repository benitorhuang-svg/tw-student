import { expect, test, type Locator, type Page } from '@playwright/test'

import { THEME_STORAGE_KEY } from '../../src/lib/constants'

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

async function enableDarkTheme(page: Page) {
  await page.addInitScript((storageKey: string) => {
    window.localStorage.setItem(storageKey, 'dark')
  }, THEME_STORAGE_KEY)
}

test('overview treemap exposes hover and tab-focus disclosure', async ({ page }) => {
  await page.goto('/?tab=overview')
  await waitForAtlasReady(page)

  const stackedAreaSvg = page.locator('.stacked-area-chart__svg').first()
  await expect(stackedAreaSvg).toBeVisible()
  await expect.poll(async () => stackedAreaSvg.evaluate((node) => window.getComputedStyle(node).opacity)).toBe('1')

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

  const workspaceScatterPoint = page.getByTestId('schools-peer-scatter').locator('.scatter-chart__point').first()
  await workspaceScatterPoint.scrollIntoViewIfNeeded()
  await workspaceScatterPoint.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('school-focus-panel')).toBeVisible()

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

  await page.getByRole('tab', { name: '回到各校分析' }).click()
  await expect(page.getByTestId('schools-distribution-card')).toBeVisible()
  const boxPlotGroup = page.locator('.box-plot-chart__group').first()
  await boxPlotGroup.focus()
  await page.keyboard.press(' ')
  await expect(page.locator('.box-plot-chart__median-label--visible')).toBeVisible()
})

test('school trend chart supports hover, keyboard focus, and benchmark disclosure', async ({ page }) => {
  await page.goto(`/?county=${encodeURIComponent(taichungCountyId)}&tab=schools&level=${encodeURIComponent('全部')}`)
  await waitForAtlasReady(page)

  await page.getByTestId('dashboard-search-input').fill(school193667Code)
  await expect(page.getByTestId('school-focus-panel')).toContainText(school193667Code)

  await page.locator('[aria-label="單校圖表分頁"]').getByRole('tab', { name: '校別趨勢' }).click()
  const trendChart = page.locator('.trend-chart').first()
  await trendChart.scrollIntoViewIfNeeded()
  await expect(page.locator('.trend-chart__legend')).toContainText('同學制平均')

  const trendPoint = page.locator('.trend-chart__point').first()
  await trendPoint.hover({ force: true })
  await expect(page.locator('.trend-chart__crosshair')).toBeVisible()
  await expect(page.locator('.trend-chart__tooltip-row')).toContainText('同學制平均')

  await trendPoint.focus()
  await page.keyboard.press(' ')
  await expect(page.locator('.trend-chart__crosshair')).toBeVisible()
})

test('county storyboard charts cover comparison, scatter, fallback pie, and responsive baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(`/?county=${encodeURIComponent(taichungCountyId)}&tab=county`)
  await waitForAtlasReady(page)

  const countyComparisonRow = page.locator('.dashboard-card--county-story .comparison-bar-chart__row').first()
  await countyComparisonRow.scrollIntoViewIfNeeded()
  await countyComparisonRow.focus()
  await expect(countyComparisonRow.locator('.comparison-bar-chart__tooltip')).toBeVisible()

  const countyScatterPoint = page.locator('.dashboard-card--county-story .scatter-chart__point').first()
  await countyScatterPoint.scrollIntoViewIfNeeded()
  await countyScatterPoint.focus()
  await expect(countyScatterPoint).toBeFocused()
  await expect(page.locator('.dashboard-card--county-story .chart-svg-tooltip__group')).toBeVisible()

  await page.getByTestId('county-storyboard-split').evaluate((node) => {
    const element = node as HTMLDivElement
    element.style.width = '720px'
  })
  await expect(page.getByTestId('county-storyboard-split')).toHaveScreenshot('county-storyboard-responsive.png')

  await page.getByTestId('dashboard-search-input').fill('無鄉鎮命中測試')
  await expect(page.getByTestId('county-fallback-pie')).toBeVisible()

  const countyFallbackSlice = page.getByTestId('county-fallback-pie').locator('.pie-chart__slice').first()
  await countyFallbackSlice.focus()
  await page.keyboard.press(' ')
  await expect(page.getByTestId('county-fallback-pie').locator('.pie-chart__tooltip')).toBeVisible()

  await page.getByTestId('county-distribution-chart').evaluate((node) => {
    const element = node as HTMLDivElement
    element.style.width = '360px'
  })
  await expect(page.getByTestId('county-distribution-chart')).toHaveScreenshot('county-fallback-pie-narrow.png')
})

test('schools workspace charts support keyboard interaction and narrow baselines', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(`/?county=${encodeURIComponent(taichungCountyId)}&tab=schools&level=${encodeURIComponent('全部')}`)
  await waitForAtlasReady(page)

  const peerScatterPoint = page.getByTestId('schools-peer-scatter').locator('.scatter-chart__point').first()
  await peerScatterPoint.scrollIntoViewIfNeeded()
  await peerScatterPoint.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('school-focus-panel')).toBeVisible()

  await page.getByRole('tab', { name: '回到各校分析' }).click()
  await expect(page.getByTestId('schools-peer-scatter')).toBeVisible()

  const histogramBin = page.getByTestId('schools-distribution-card').locator('.histogram-chart__bin').first()
  await histogramBin.focus()
  await page.keyboard.press(' ')
  await expect(page.getByTestId('schools-distribution-card').locator('.histogram-chart__tooltip').first()).toBeVisible()

  const distributionBoxPlotGroup = page.getByTestId('schools-distribution-card').locator('.box-plot-chart__group').first()
  await distributionBoxPlotGroup.focus()
  await page.keyboard.press(' ')
  await expect(page.getByTestId('schools-distribution-card').locator('.box-plot-chart__median-label--visible')).toBeVisible()

  await page.getByTestId('schools-peer-scatter').evaluate((node) => {
    const element = node as HTMLDivElement
    element.style.width = '360px'
  })
  await page.locator('body').click({ position: { x: 8, y: 8 } })
  await expect(page.getByTestId('schools-peer-scatter').locator('.scatter-chart')).toHaveScreenshot('schools-peer-scatter-narrow.png')

  const histogramChart = page.getByTestId('schools-distribution-card').locator('.histogram-chart').first()
  await histogramChart.evaluate((node) => {
    const element = node as HTMLDivElement
    element.style.width = '360px'
  })
  await expect(histogramChart).toHaveScreenshot('schools-histogram-narrow.png')

  const boxPlotChart = page.getByTestId('schools-distribution-card').locator('.box-plot-chart').first()
  await boxPlotChart.evaluate((node) => {
    const element = node as HTMLDivElement
    element.style.width = '360px'
  })
  await expect(boxPlotChart).toHaveScreenshot('schools-boxplot-narrow.png')
})

test('leaflet school markers preserve keyboard activation on focused SVG paths', async ({ page }) => {
  await page.goto(`/?county=${encodeURIComponent(taichungCountyId)}&tab=county`)
  await waitForAtlasReady(page)

  const townshipComparisonRow = page.locator('.comparison-bar-chart__row').first()
  await townshipComparisonRow.scrollIntoViewIfNeeded()
  await townshipComparisonRow.click()

  const schoolMarker = page.locator('.atlas-school-marker').first()
  await expect(schoolMarker).toBeVisible({ timeout: 10000 })
  await schoolMarker.focus()
  await expect(schoolMarker).toBeFocused()
  await expect(page.locator('.atlas-map-tooltip--preview')).toBeVisible()

  await page.keyboard.press('Enter')
  await expect(page.getByTestId('school-focus-panel')).toBeVisible({ timeout: 10000 })
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

  await page.locator('[aria-label="單校圖表分頁"]').getByRole('tab', { name: '校別概況' }).click()
  await page.locator('.school-composition-chart').first().evaluate((node) => {
    const element = node as HTMLDivElement
    element.style.width = '360px'
  })
  await page.locator('.school-composition-chart').first().scrollIntoViewIfNeeded()
  await expect(page.locator('.school-composition-chart').first()).toHaveScreenshot('school-composition-narrow.png')

  await page.locator('[aria-label="單校圖表分頁"]').getByRole('tab', { name: '規模定位' }).click()
  await page.locator('.pr-indicator').first().evaluate((node) => {
    const element = node as HTMLDivElement
    element.style.width = '360px'
  })
  await page.locator('.pr-indicator').first().scrollIntoViewIfNeeded()
  await expect(page.locator('.pr-indicator').first()).toHaveScreenshot('pr-indicator-narrow.png')
})

test('dark-theme screenshots keep key chart surfaces readable', async ({ page }) => {
  await enableDarkTheme(page)
  await page.setViewportSize({ width: 1280, height: 900 })

  await page.goto('/?tab=overview')
  await waitForAtlasReady(page)
  await expect(page.getByTestId('atlas-app')).toHaveAttribute('data-theme', 'dark')

  const treemapChart = page.locator('.treemap-chart').first()
  await treemapChart.scrollIntoViewIfNeeded()
  await expect(treemapChart).toHaveScreenshot('overview-treemap-dark.png')

  await page.goto('/?tab=regional')
  await waitForAtlasReady(page)
  await expect(page.getByTestId('atlas-app')).toHaveAttribute('data-theme', 'dark')

  const comparisonChart = page.locator('.comparison-bar-chart').first()
  await comparisonChart.scrollIntoViewIfNeeded()
  await expect(comparisonChart).toHaveScreenshot('overview-comparison-dark.png')

  await page.goto(`/?county=${encodeURIComponent(taichungCountyId)}&tab=schools&level=${encodeURIComponent('全部')}`)
  await waitForAtlasReady(page)
  await expect(page.getByTestId('atlas-app')).toHaveAttribute('data-theme', 'dark')

  const histogramChart = page.locator('.histogram-chart').first()
  await histogramChart.scrollIntoViewIfNeeded()
  await expect(histogramChart).toHaveScreenshot('schools-histogram-dark.png')

  await page.getByTestId('dashboard-search-input').fill(school193667Code)
  await expect(page.getByTestId('school-focus-panel')).toContainText(school193667Code)
  await page.locator('[aria-label="單校圖表分頁"]').getByRole('tab', { name: '校別趨勢' }).click()

  const trendChart = page.locator('.trend-chart').first()
  await trendChart.scrollIntoViewIfNeeded()
  await expect(trendChart).toHaveScreenshot('school-trend-dark.png')
})