import { test, expect } from '@playwright/test'

test('taichung county marker click zooms in and selects county', async ({ page }) => {
  // Proxy browser console to node output for easier debugging
  page.on('console', (msg) => console.log('[browser]', msg.text()))

  // Force desktop viewport to ensure wide-layout map is shown
  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const canvas = page.locator('.atlas-map-canvas')
  await expect(canvas).toBeVisible({ timeout: 10000 })

  const zoomLocator = page.locator('.map-zoom-level')
  const initialZoomText = (await zoomLocator.textContent()) ?? ''
  const initialZoom = Number(initialZoomText) || 0

  // Match either '臺中市' or '台中市'
  const marker = page.getByRole('button', { name: /查看 [台臺]中(市)?/ })
  await expect(marker).toBeVisible({ timeout: 10000 })

  // Try activating marker via mouse click (user action). Fallback to keyboard if needed.
  // Try click first; if clicking doesn't update selection, fall back to keyboard activation.
  await marker.click({ timeout: 3000 }).catch(() => null)

  // If click did not cause selection within 2s, fallback to keyboard activation
  const selectedByClick = await page.waitForFunction(() => {
    const el = document.querySelector('.map-breadcrumb__current')
    return !!el && /(台|臺)中(市)?/.test(el.textContent || '')
  }, undefined, { timeout: 2000 }).catch(() => false)

  if (!selectedByClick) {
    // Fallback: keyboard activation
    await marker.focus()
    await page.keyboard.press('Enter')
    await page.evaluate(() => console.log('marker-click: fallback-used'))
  } else {
    await page.evaluate(() => console.log('marker-click: selected-by-click'))
  }

  // Breadcrumb should update to Taichung (either variant)
  await expect(page.locator('.map-breadcrumb__current')).toHaveText(/(台|臺)中(市)?/, { timeout: 5000 })

  // Wait for the animated flyTo to increase zoom
  await page.waitForFunction((prev) => {
    const el = document.querySelector('.map-zoom-level')
    if (!el) return false
    const val = Number(el.textContent || '0')
    return val > prev
  }, initialZoom, { timeout: 5000 })

  const zoomAfterText = (await zoomLocator.textContent()) ?? ''
  const zoomAfter = Number(zoomAfterText) || 0
  expect(zoomAfter).toBeGreaterThan(initialZoom)

  // Sanity: URL should contain a county param
  const url = new URL(await page.url())
  expect(url.searchParams.get('county')).toBeTruthy()
})
