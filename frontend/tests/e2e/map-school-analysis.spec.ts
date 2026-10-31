import { expect, test, type Page } from '@playwright/test'

async function openSelectedSchool(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?year=114&county=66000&township=66000170&school=064504&zoom=13&lat=24.2095&lon=120.708&tab=school-focus')
  await expect(page.locator('.map-trend-card__title')).toHaveText('年度趨勢 · 市立潭子國中', { timeout: 30000 })
  await expect(page.locator('.map-analysis-status strong')).toHaveText('市立潭子國中')
}

async function expectSelectedRowInView(page: Page) {
  const selected = page.locator('.map-school-ranking-row[data-active="true"]')
  await expect(selected).toHaveAttribute('aria-pressed', 'true')
  await expect(selected).toContainText('市立潭子國中')
  await expect(selected).toContainText('目前選取')
  await expect.poll(() => selected.evaluate((row) => {
    const bounds = row.getBoundingClientRect()
    const list = row.closest('ol')!.getBoundingClientRect()
    return bounds.top >= list.top && bounds.bottom <= list.bottom
  })).toBe(true)
}

test('ranking uses its region title and brings the selected school beyond the top ten into view', async ({ page }) => {
  await openSelectedSchool(page)
  await page.getByRole('button', { name: '學生人數', exact: true }).click()
  await expect(page.locator('.map-analysis-status strong')).toHaveText('潭子區學校排行')
  await expect(page.locator('.map-school-ranking-row')).toHaveCount(11)
  const selected = page.locator('.map-school-ranking-row[data-active="true"]')
  expect(Number(await selected.locator('.map-school-ranking-rank').textContent())).toBeGreaterThan(10)
  await expectSelectedRowInView(page)
  await page.getByRole('button', { name: '收起分析', exact: true }).click()
  await page.getByRole('button', { name: '顯示分析', exact: true }).click()
  await expectSelectedRowInView(page)

  for (const mode of ['增加率', '減少率']) {
    await page.getByRole('button', { name: mode, exact: true }).click()
    await expect(page.locator('.map-analysis-status strong')).toHaveText('潭子區學校排行')
    await expectSelectedRowInView(page)
  }
  await page.setViewportSize({ width: 320, height: 740 })
  await expectSelectedRowInView(page)
  await page.getByRole('button', { name: '歷史趨勢', exact: true }).click()
  await expect(page.locator('.map-analysis-status strong')).toHaveText('市立潭子國中')
  await expect(page.getByRole('navigation', { name: '地圖路徑' })).not.toContainText('市立潭子國中')
})

test('trend points and year labels change the controlled year and stop playback with mouse and keyboard', async ({ page }) => {
  await openSelectedSchool(page)
  const active = page.locator('.map-trend-card__plot circle[data-active-year="true"]')
  await page.locator('.map-trend-card__plot circle[data-year="113"]').click()
  await expect(page.locator('.map-year-stepper__label')).toHaveText('113學年度')
  await expect(active).toHaveAttribute('data-year', '113')
  await page.getByRole('button', { name: '切換至 112 學年度', exact: true }).locator('.map-trend-card__plot-year').click()
  await expect(page.locator('.map-year-stepper__label')).toHaveText('112學年度')
  await page.getByRole('button', { name: '切換至 109 學年度', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(active).toHaveAttribute('data-year', '109')
  await page.getByRole('button', { name: '切換至 110 學年度', exact: true }).focus()
  await page.keyboard.press(' ')
  await expect(active).toHaveAttribute('data-year', '110')
  await page.getByRole('button', { name: '開始播放', exact: true }).click()
  await page.getByRole('button', { name: '切換至 111 學年度', exact: true }).click()
  await expect(page.getByRole('button', { name: '開始播放', exact: true })).toBeVisible()
  await expect(page.locator('.map-year-stepper__label')).toHaveText('111學年度')
  await expect(active).toHaveAttribute('data-year', '111')
  await expect(active).toHaveCSS('fill', await active.evaluate((element) => getComputedStyle(element).stroke))
  await expect(page.locator('.map-trend-card__title')).toHaveText('年度趨勢 · 市立潭子國中')
  await expect(page.locator('.atlas-selected-marker-molecule-container')).toBeVisible()
})

test('selected star remains clickable above nearby school hit targets and clearing selection restores marker opacity', async ({ page }) => {
  await openSelectedSchool(page)
  const medianAlpha = () => page.locator('.leaflet-school-marker-pane-pane canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement
    const rgba = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
    const alphas: number[] = []
    for (let index = 0; index < rgba.length; index += 4) {
      const colorRange = Math.max(rgba[index], rgba[index + 1], rgba[index + 2]) - Math.min(rgba[index], rgba[index + 1], rgba[index + 2])
      if (rgba[index + 3] > 0 && colorRange > 40) alphas.push(rgba[index + 3])
    }
    alphas.sort((a, b) => a - b)
    return alphas[Math.floor(alphas.length / 2)] ?? 0
  })
  await expect.poll(medianAlpha).toBeGreaterThan(0)
  const selectedAlpha = await medianAlpha()
  await page.locator('.atlas-selected-marker-molecule-container').click()
  await expect(page.locator('.atlas-selected-marker-molecule-container')).toHaveCount(0)
  await expect.poll(medianAlpha).toBeGreaterThan(selectedAlpha)
})
