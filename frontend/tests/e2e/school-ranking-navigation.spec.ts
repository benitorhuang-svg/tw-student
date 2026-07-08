import { test, expect } from '@playwright/test'

test('school marker and ranking row select a school without map errors', async ({ page }) => {
  const pageErrors: Error[] = []
  page.on('pageerror', (error) => pageErrors.push(error))

  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto('/?year=114&lat=24.66510&lon=121.77550&zoom=13&county=10002&tab=schools&township=10002020')
  await page.waitForLoadState('networkidle')

  const rankingPanel = page.locator('.map-school-ranking')
  await expect(rankingPanel).toBeVisible({ timeout: 20000 })

  await page.locator('.map-school-ranking-select').selectOption('growth')
  const firstRankingRow = page.locator('.map-school-ranking-row').first()
  await expect(firstRankingRow).toBeVisible({ timeout: 10000 })
  await firstRankingRow.click()

  await page.waitForFunction(() => {
    const url = new URL(window.location.href)
    return Boolean(url.searchParams.get('school'))
  }, undefined, { timeout: 10000 })

  const selectedUrl = new URL(page.url())
  const selectedSchoolId = selectedUrl.searchParams.get('school') ?? ''
  expect(selectedSchoolId).toBeTruthy()

  const selectedMarker = page.locator('.atlas-selected-marker-molecule-container').first()
  await expect(selectedMarker).toBeVisible({ timeout: 10000 })

  const mapCanvas = page.locator('.atlas-map-canvas')
  const mapBox = await mapCanvas.boundingBox()
  expect(mapBox).not.toBeNull()

  await page.mouse.click(mapBox!.x + mapBox!.width - 80, mapBox!.y + mapBox!.height / 2)
  await page.waitForFunction(() => {
    const url = new URL(window.location.href)
    return !url.searchParams.get('school')
  }, undefined, { timeout: 10000 })
  await expect(selectedMarker).toBeHidden({ timeout: 10000 })

  const visibleSchoolHitTarget = await page.evaluate(() => {
    const targets = [...document.querySelectorAll<HTMLElement>('.atlas-school-marker-hit-target')]

    for (const target of targets) {
      const rect = target.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      if (
        rect.width <= 0 ||
        rect.height <= 0 ||
        centerX < 0 ||
        centerY < 0 ||
        centerX > window.innerWidth ||
        centerY > window.innerHeight
      ) {
        continue
      }

      const topElement = document.elementFromPoint(centerX, centerY)
      if (topElement === target || target.contains(topElement)) {
        return {
          x: centerX,
          y: centerY,
          schoolId: target.querySelector('[data-school-marker-id]')?.getAttribute('data-school-marker-id') ?? '',
        }
      }
    }

    return null
  })

  expect(visibleSchoolHitTarget).not.toBeNull()
  expect(visibleSchoolHitTarget!.schoolId).toBeTruthy()

  await page.mouse.click(visibleSchoolHitTarget!.x, visibleSchoolHitTarget!.y)

  await page.waitForFunction((schoolId) => {
    const url = new URL(window.location.href)
    return url.searchParams.get('school') === schoolId
  }, visibleSchoolHitTarget!.schoolId, { timeout: 10000 })

  expect(pageErrors).toEqual([])
})
