import { test, expect } from '@playwright/test'

// Basic smoke test to load app, zoom to Chiayi region and click county markers for 嘉義市/嘉義縣
// Adjust selectors based on rendered DOM; this test will try to find marker labels.

test('chiayi township display', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Wait for map canvas and county markers
  const canvas = page.locator('.atlas-map-canvas')
  await expect(canvas).toBeVisible({ timeout: 10000 })

  const clickCountyMarker = async (countyName: string) => {
    const marker = page.getByRole('button', { name: `查看 ${countyName}` })
    await expect(marker).toBeVisible({ timeout: 10000 })
    await marker.focus()
    await page.keyboard.press('Enter')
    return true
  }

  // Try clicking 嘉義市 then 嘉義縣
  await clickCountyMarker('嘉義市')
  const clickedCounty = await clickCountyMarker('嘉義縣')

  // If clicking the county marker succeeded, the map should center and zoom to 10.
  // We verify by checking the breadcrumb scope.
  let zoomAfterCountySelection: number | null = null
  if (clickedCounty) {
    await expect(page.locator('.map-breadcrumb__current')).toHaveText('嘉義縣')
    zoomAfterCountySelection = Number(await page.locator('.map-zoom-level').textContent())
  }

  // zoom in to trigger township display
  const zoomInButton = page.getByRole('button', { name: '放大' })
  await zoomInButton.click()
  await page.waitForTimeout(800)
  await zoomInButton.click()
  await page.waitForTimeout(800)

  if (zoomAfterCountySelection != null) {
    const zoomAfterManualZoomIn = Number(await page.locator('.map-zoom-level').textContent())
    expect(zoomAfterManualZoomIn).toBeGreaterThan(zoomAfterCountySelection)
  }

  // Wait a bit for layer updates after zooming.
  await page.waitForTimeout(1000)
  await expect(page.locator('.map-breadcrumb__current')).toHaveText('嘉義縣')

  // now simulate the regression described in issue: deep-link to zoom 11 on
  // 嘉義縣 and make sure 嘉市 is still visible (county marker should remain).
  await page.goto('/?year=114&county=10010&tab=county&zoom=11&lat=23.4673&lon=120.5019')
  await page.waitForTimeout(1000) // allow layer updates
  await expect(page.getByRole('button', { name: '查看 嘉義市' })).toBeVisible()
})

test('maintains unknown URL params (vectorTiles) after load', async ({ page }) => {
  await page.goto('/?vectorTiles=true&year=114')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
  const url = page.url()
  expect(url).toContain('vectorTiles=true')
})
