import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// __dirname replacement for ESM (works on Windows and POSIX)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

test('profile taichung interaction and save cpu profile', async ({ page }) => {
  page.on('console', (msg) => console.log('[browser]', msg.text()))

  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Create a CDP session (Chromium only)
  const client = await page.context().newCDPSession(page)
  await client.send('Profiler.enable')
  await client.send('Profiler.start')

  // Perform the same steps as the taichung click test
  const marker = page.getByRole('button', { name: /查看 [台臺]中(市)?/ })
  await expect(marker).toBeVisible({ timeout: 10000 })
  await marker.click({ timeout: 3000 }).catch(() => null)

  const selectedByClick = await page.waitForFunction(() => {
    const el = document.querySelector('.map-breadcrumb__current')
    return !!el && /(台|臺)中(市)?/.test(el.textContent || '')
  }, undefined, { timeout: 2000 }).catch(() => false)

  if (!selectedByClick) {
    await marker.focus()
    await page.keyboard.press('Enter')
  }

  // Wait a short period while the map animates so the profiler captures activity
  await page.waitForTimeout(2000)

  // Stop profiler and write profile
  const prof = await client.send('Profiler.stop')
  const outDir = path.resolve(__dirname, '../../test-results')
  try { fs.mkdirSync(outDir, { recursive: true }) } catch {}
  const outPath = path.join(outDir, 'profile-taichung.cpuprofile')
  fs.writeFileSync(outPath, JSON.stringify(prof.profile))
  console.log('wrote cpu profile to', outPath)

  // Basic sanity check of the page still shows selection
  await expect(page.locator('.map-breadcrumb__current')).toHaveText(/(台|臺)中(市)?/, { timeout: 5000 })
})
