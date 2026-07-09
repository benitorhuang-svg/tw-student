import { test, expect } from '@playwright/test'

test('hsinchu county marker click zooms in and selects county on first click', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const canvas = page.locator('.atlas-map-canvas')
  await expect(canvas).toBeVisible({ timeout: 10000 })

  const zoomLocator = page.locator('.map-zoom-level')
  const initialZoomText = (await zoomLocator.textContent()) ?? ''
  const initialZoom = Number(initialZoomText) || 0

  const marker = page.getByRole('button', { name: '查看 新竹市' })
  await expect(marker).toBeVisible({ timeout: 10000 })

  await marker.click()

  await expect(page.locator('.map-breadcrumb__current')).toHaveText('新竹市', { timeout: 5000 })

  await page.waitForFunction((prev) => {
    const el = document.querySelector('.map-zoom-level')
    if (!el) return false
    const val = Number(el.textContent || '0')
    return val > prev
  }, initialZoom, { timeout: 5000 })

  const zoomAfterText = (await zoomLocator.textContent()) ?? ''
  const zoomAfter = Number(zoomAfterText) || 0
  expect(zoomAfter).toBeGreaterThan(initialZoom)
})