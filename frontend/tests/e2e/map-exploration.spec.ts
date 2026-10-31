import { expect, test, type Page } from '@playwright/test'

async function loadMap(page: Page, url = '/') {
  await page.goto(url)
  await expect(page.locator('.atlas-map-canvas')).toBeVisible({ timeout: 20000 })
}

test('national view has counties without a statistics card or forced township labels', async ({ page }) => {
  await loadMap(page, '/?year=114&zoom=7&lat=23.52280&lon=119.50130')
  await expect(page.locator('.atlas-county-pin-wrapper')).toHaveCount(22)
  await expect(page.getByTestId('map-scope-card')).toHaveCount(0)
  await expect(page.locator('.atlas-all-township-label')).toHaveCount(0)
  if ((page.viewportSize()?.width ?? 0) <= 860) {
    const theme = await page.getByRole('button', { name: '切換亮暗模式' }).boundingBox()
    const help = await page.getByRole('button', { name: '切換探索提示與圖例' }).boundingBox()
    expect(Math.abs(theme!.y - help!.y)).toBeLessThanOrEqual(1)
    expect(theme!.x + theme!.width).toBeLessThan(help!.x)
    expect(help!.y).toBeLessThan(132)
  }
  await page.getByRole('button', { name: '切換探索提示與圖例' }).click()
  const legend = page.getByRole('region', { name: '地圖圖例' })
  await expect(legend).toContainText('114／113')
  await expect(legend).toContainText('持平 ±0.5%')
  await page.getByRole('button', { name: '完整地名', exact: true }).click()
  await expect(page.locator('.atlas-all-township-label')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '精簡地名', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '切換探索提示與圖例' }).click()
  await expect(page.getByTestId('map-scope-card')).toHaveCount(0)
})

test('selection identifies the county and school and returns to county-only national view', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await loadMap(page)
  await page.getByRole('button', { name: '查看 宜蘭縣', exact: true }).click()
  await expect(page.locator('.map-breadcrumb__current')).toHaveText('宜蘭縣')
  await expect(page.locator('.atlas-county-pin.is-active .atlas-county-pin__label')).toHaveText('宜蘭縣')

  for (let step = 0; step < 5 && Number(await page.locator('.map-zoom-level').textContent()) < 12; step++) {
    const previous = Number(await page.locator('.map-zoom-level').textContent())
    await page.getByRole('button', { name: '放大', exact: true }).click()
    await expect.poll(async () => Number(await page.locator('.map-zoom-level').textContent())).toBeGreaterThan(previous)
  }
  await expect.poll(async () => page.locator('.atlas-school-marker-hit-target').count(), { timeout: 20000 }).toBeGreaterThan(0)
  await page.getByRole('button', { name: '切換探索提示與圖例' }).click()
  await expect(page.getByRole('region', { name: '地圖圖例' })).toContainText('校點依學制')
  await expect(page.getByRole('region', { name: '地圖圖例' })).toContainText('大專院校')
  await page.getByRole('button', { name: '切換探索提示與圖例' }).click()

  const target = await page.evaluate(() => {
    for (const element of document.querySelectorAll<HTMLElement>('.atlas-school-marker-hit-target')) {
      const rect = element.getBoundingClientRect()
      const x = rect.x + rect.width / 2
      const y = rect.y + rect.height / 2
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue
      const top = document.elementFromPoint(x, y)
      if (top === element || element.contains(top)) return { x, y }
    }
    return null
  })
  if ((page.viewportSize()?.width ?? 0) <= 860) {
    await page.getByRole('button', { name: '顯示分析', exact: true }).click()
    await page.locator('.map-school-ranking-row').first().click()
  } else {
    if (target) await page.mouse.click(target.x, target.y)
    else {
      await page.locator('.atlas-school-marker-hit-target').first().focus()
      await page.keyboard.press(' ')
    }
  }
  await expect(page.locator('.atlas-selected-marker-molecule-container')).toBeVisible()
  await expect(page.getByRole('navigation', { name: '地圖路徑' })).not.toContainText(/國小|國中|高中|大學|學院/)
  if ((page.viewportSize()?.width ?? 0) <= 860) {
    await expect(page.locator('.map-analysis-status strong')).not.toHaveText('宜蘭縣')
  }
  await expect(page.locator('.map-breadcrumb__current')).toHaveAttribute('aria-current', 'location')
  await expect(page.getByRole('navigation', { name: '地圖路徑' })).toHaveCSS('overflow-x', 'hidden')
  await expect(page.getByRole('navigation', { name: '地圖路徑' })).toHaveCSS('scrollbar-width', 'none')
  await page.getByRole('navigation', { name: '地圖路徑' }).getByRole('button', { name: '全台', exact: true }).click()
  await expect(page.locator('.map-breadcrumb__current')).toHaveText('全台')
  await expect(page.locator('.atlas-selected-marker-molecule-container')).toHaveCount(0)
  await expect(page.locator('.atlas-all-township-label')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('carried data is identified in analysis without adding a floating statistics card', async ({ page }) => {
  await loadMap(page, '/?year=109')
  const isMobile = (page.viewportSize()?.width ?? 0) <= 860
  if (isMobile) {
    await page.getByRole('button', { name: '顯示分析', exact: true }).click()
    await expect(page.locator('.map-analysis-status')).toContainText('含沿用資料')
    await expect(page.getByText('先點選縣市，再查看區域內的學校排行。')).toBeVisible()
    await page.getByRole('button', { name: '收起分析', exact: true }).click()
  } else {
    await expect(page.locator('.dashboard-projection-badge')).toHaveText('含沿用資料')
  }
  await expect(page.getByTestId('map-scope-card')).toHaveCount(0)
})

test('education colors stay consistent in chart series across themes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await loadMap(page)
  await page.getByRole('button', { name: '全台各級學制歷年學生人數', exact: true }).click()
  const colors = { 國小: 'rgb(34, 197, 94)', 國中: 'rgb(56, 189, 248)', 高中職: 'rgb(245, 158, 11)', 大專院校: 'rgb(239, 68, 68)' }
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') await page.getByRole('button', { name: '切換亮暗模式' }).click()
    for (const [level, color] of Object.entries(colors)) {
      await expect(page.locator(`.stacked-bar-series [data-education-level="${level}"]`).first()).toHaveCSS('fill', color)
    }
  }
})

test('mobile trend marks the controlled academic year with a solid circle including older years', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await loadMap(page, '/?year=114')
  await page.getByRole('button', { name: '顯示分析', exact: true }).click()
  await page.getByRole('button', { name: '歷史趨勢', exact: true }).click()
  const active = page.locator('.map-trend-card__plot circle[data-active-year="true"]')
  await expect(active).toHaveCount(1)
  await expect(active).toHaveAttribute('data-year', '114')
  await expect(active).toHaveCSS('fill', await active.evaluate((element) => getComputedStyle(element).stroke))
  await expect(active).toHaveAttribute('r', '4.5')
  for (let year = 113; year >= 107; year--) {
    await page.getByRole('button', { name: '上一個學年度', exact: true }).click()
    await expect(page.locator('.map-year-stepper__label')).toContainText(String(year))
    await expect(active).toHaveAttribute('data-year', String(year))
  }
})
