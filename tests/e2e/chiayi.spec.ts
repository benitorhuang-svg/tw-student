import { test, expect } from '@playwright/test'

// Basic smoke test to load app, zoom to Chiayi region and click county markers for 嘉義市/嘉義縣
// Adjust selectors based on rendered DOM; this test will try to find marker labels.

test('chiayi township display', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Wait for map canvas
  const canvas = page.locator('.atlas-map-canvas')
  await expect(canvas).toBeVisible({ timeout: 10000 })

  // helper to find marker by visible label text
  const clickMarkerByLabel = async (label: string) => {
    // Try to find marker divs that include the label text
    const marker = page.locator(`.atlas-map-canvas .atlas-map-tooltip:visible, .atlas-map-canvas div:has-text("${label}")`).first()
    if (await marker.count() === 0) {
      // fallback: click approximate map coordinates center of Chiayi
      return false
    }
    await marker.click({ force: true })
    return true
  }

  // Try clicking 嘉義市 then 嘉義縣
  const clickedCity = await clickMarkerByLabel('嘉市')
  const clickedCounty = await clickMarkerByLabel('嘉縣')

  // If clicking the county marker succeeded, the map should center and zoom to 10.
  // We verify by checking the URL sync params (zoom/lat/lon) that are written by the app.
  if (clickedCounty) {
    await page.waitForFunction(() => window.location.search.includes('zoom=10'))

    const { zoom, lat, lon } = await page.evaluate(() => {
      const params = new URL(window.location.href).searchParams
      return {
        zoom: Number(params.get('zoom')),
        lat: Number(params.get('lat')),
        lon: Number(params.get('lon')),
      }
    })

    expect(zoom).toBe(10)
    // County center for 嘉義縣 should be near { lat: 23.4497, lon: 120.5179 }
    expect(lat).toBeGreaterThan(23.35)
    expect(lat).toBeLessThan(23.55)
    expect(lon).toBeGreaterThan(120.4)
    expect(lon).toBeLessThan(120.65)
  }

  // zoom in to trigger township display
  await page.keyboard.press('+')
  await page.waitForTimeout(800)
  await page.keyboard.press('+')
  await page.waitForTimeout(800)

  // Wait a bit for township labels to appear
  await page.waitForTimeout(1000)

  // take screenshot
  await page.screenshot({ path: 'tests/e2e/screenshots/chiayi.png', fullPage: false })

  // Assert that township label text like 中埔 or 水上 appears
  const townshipVisible = await page.locator('text=中埔').count() + await page.locator('text=水上').count()
  expect(townshipVisible).toBeGreaterThan(0)

  // now simulate the regression described in issue: deep-link to zoom 11 on
  // 嘉義縣 and make sure 嘉市 is still visible (county marker should remain).
  await page.goto('/?year=114&county=10010&tab=county&zoom=11&lat=23.4673&lon=120.5019')
  await page.waitForTimeout(1000) // allow layer updates
  const chiayiCityMarkers = await page.locator('text=嘉市').count()
  expect(chiayiCityMarkers).toBeGreaterThan(0)
})

test('maintains unknown URL params (vectorTiles) after load', async ({ page }) => {
  await page.goto('/?vectorTiles=true&year=114')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
  const url = page.url()
  expect(url).toContain('vectorTiles=true')
})
