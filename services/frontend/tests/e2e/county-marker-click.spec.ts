import { test, expect } from '@playwright/test'

test('county marker click zooms in and selects county', async ({ page }) => {
  // Proxy browser console to node output for easier debugging
  page.on('console', (msg) => console.log('[browser]', msg.text()))

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const canvas = page.locator('.atlas-map-canvas')
  await expect(canvas).toBeVisible({ timeout: 10000 })

  const zoomLocator = page.locator('.map-zoom-level')
  const initialZoomText = (await zoomLocator.textContent()) ?? ''
  const initialZoom = Number(initialZoomText) || 0

  const countyName = '嘉義縣'
  const marker = page.getByRole('button', { name: `查看 ${countyName}` })
  await expect(marker).toBeVisible({ timeout: 10000 })

  // Use keyboard activation which is how accessibility interacts with markers
  await marker.focus()
  await page.keyboard.press('Enter')

  // Expect breadcrumb to update to the county name
  await expect(page.locator('.map-breadcrumb__current')).toHaveText(countyName, { timeout: 5000 })

  // Wait for the map zoom level to increase (map.flyTo is animated)
  await page.waitForFunction((prev) => {
    const el = document.querySelector('.map-zoom-level')
    if (!el) return false
    const val = Number(el.textContent || '0')
    return val > prev
  }, initialZoom, { timeout: 5000 })

  const zoomAfterText = (await zoomLocator.textContent()) ?? ''
  const zoomAfter = Number(zoomAfterText) || 0
  expect(zoomAfter).toBeGreaterThan(initialZoom)

  // Ensure the county is reflected in the URL (optional sanity check)
  const url = new URL(await page.url())
  expect(url.searchParams.get('county')).toBeTruthy()
})
