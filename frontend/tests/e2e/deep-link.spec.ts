import { test, expect } from '@playwright/test'

// Minimal tests to ensure URL params behave correctly.

test('vectorTiles param is preserved after load', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/?vectorTiles=true&year=114')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
  expect(page.url()).toContain('vectorTiles=true')
})

test('school param does not force tab when tab=overview', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/?tab=overview&school=193667')
  await page.waitForLoadState('networkidle')
  // The app should not auto-switch into school-focus when tab=overview is set.
  expect(page.url()).not.toContain('tab=school-focus')
  expect(page.url()).toContain('school=193667')
})

test('tab=school-focus plus school param retains school-focus', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/?tab=school-focus&school=193667')
  await page.waitForLoadState('networkidle')
  expect(page.url()).toContain('tab=school-focus')
})
test('zoom param is capped at 12', async ({ page }) => {
  await page.goto('/?zoom=13')
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(() => new URL(window.location.href).searchParams.get('zoom') === '12')
  expect(new URL(await page.url()).searchParams.get('zoom')).toBe('12')
})
