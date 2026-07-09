# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend\tests\e2e\county-marker-click.spec.ts >> county marker click zooms in and selects county
- Location: frontend\tests\e2e\county-marker-click.spec.ts:3:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test('county marker click zooms in and selects county', async ({ page }) => {
  4  |   // Proxy browser console to node output for easier debugging
  5  |   page.on('console', (msg) => console.log('[browser]', msg.text()))
  6  | 
> 7  |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  8  |   await page.waitForLoadState('networkidle')
  9  | 
  10 |   const canvas = page.locator('.atlas-map-canvas')
  11 |   await expect(canvas).toBeVisible({ timeout: 10000 })
  12 | 
  13 |   const zoomLocator = page.locator('.map-zoom-level')
  14 |   const initialZoomText = (await zoomLocator.textContent()) ?? ''
  15 |   const initialZoom = Number(initialZoomText) || 0
  16 | 
  17 |   const countyName = '嘉義縣'
  18 |   const marker = page.getByRole('button', { name: `查看 ${countyName}` })
  19 |   await expect(marker).toBeVisible({ timeout: 10000 })
  20 | 
  21 |   await marker.click()
  22 | 
  23 |   // Expect breadcrumb to update to the county name
  24 |   await expect(page.locator('.map-breadcrumb__current')).toHaveText(countyName, { timeout: 5000 })
  25 | 
  26 |   // Wait for the map zoom level to increase (map.flyTo is animated)
  27 |   await page.waitForFunction((prev) => {
  28 |     const el = document.querySelector('.map-zoom-level')
  29 |     if (!el) return false
  30 |     const val = Number(el.textContent || '0')
  31 |     return val > prev
  32 |   }, initialZoom, { timeout: 5000 })
  33 | 
  34 |   const zoomAfterText = (await zoomLocator.textContent()) ?? ''
  35 |   const zoomAfter = Number(zoomAfterText) || 0
  36 |   expect(zoomAfter).toBeGreaterThan(initialZoom)
  37 | 
  38 |   // Ensure the county is reflected in the URL (optional sanity check)
  39 |   const url = new URL(await page.url())
  40 |   expect(url.searchParams.get('county')).toBeTruthy()
  41 | })
  42 | 
```