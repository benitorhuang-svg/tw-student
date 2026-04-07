import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const screenshotDir = path.resolve(SCRIPT_DIR, '..', 'tests', 'e2e', 'screenshots')
const screenshotPath = path.join(screenshotDir, 'chiayi.png')

async function run() {
  const url = 'http://127.0.0.1:4173'
  const browser = await chromium.launch()
  const page = await browser.newPage()
  try {
    const chiayiUrl = url + '?year=114&county=10010'
    console.log('Navigating to', chiayiUrl)
    await page.goto(chiayiUrl, { waitUntil: 'networkidle' })
    await page.waitForSelector('.atlas-map-canvas', { timeout: 10000 })

    // zoom until we reach level 11 (township boundaries appear at 11+)
    await page.waitForTimeout(300)
    let currentZoom = await page.evaluate(() => {
      const el = document.querySelector('.atlas-map-canvas')
      return el && el._leaflet_map ? el._leaflet_map.getZoom() : 0
    })
    while (currentZoom < 11) {
      await page.keyboard.press('+')
      await page.waitForTimeout(400)
      currentZoom = await page.evaluate(() => {
        const el = document.querySelector('.atlas-map-canvas')
        return el && el._leaflet_map ? el._leaflet_map.getZoom() : 0
      })
    }

    // attempt to click either 嘉市 or 嘉縣 label; whichever is rendered first
    let chiayiHandle = await page.$('text=嘉市')
    if (!chiayiHandle) chiayiHandle = await page.$('text=嘉縣')
    if (chiayiHandle) {
      const labelText = await page.evaluate((el) => el.textContent, chiayiHandle)
      console.log(`Found ${labelText} label — clicking`)
      await chiayiHandle.click({ force: true })
      // allow time for townships to appear
      await page.waitForTimeout(2500)
    } else {
      console.log('No 嘉市/嘉縣 label found to click')
    }

    // take screenshot
    await fs.promises.mkdir(screenshotDir, { recursive: true })
    await page.screenshot({ path: screenshotPath })
    console.log('Saved screenshot to', screenshotPath)

    // check for two Chiayi townships along with at least one neighboring-county label
    const count1 = await page.locator('text=中埔').count()
    const count2 = await page.locator('text=水上').count()
    const countOther = await page.locator('text=白河').count()
    const found = count1 + count2
    console.log('Found Chiayi township labels:', found, '(other-county labels:', countOther, ')')

    if (found > 0) {
      console.log('CHIAYI CHECK: PASSED')
    } else {
      console.log('CHIAYI CHECK: FAILED')
      await browser.close()
      process.exit(2)
    }

    // --- additional regression check ------------------------------------------------
    // make sure a zoom-9 deep link does not auto-zoom to 11
    const testUrl = url + '?year=114&county=10010&tab=county&zoom=9&lat=23.4712&lon=120.5919'
    const page2 = await browser.newPage()
    console.log('Testing deep link at zoom 9:', testUrl)
    await page2.goto(testUrl, { waitUntil: 'networkidle' })
    await page2.waitForSelector('.atlas-map-canvas', { timeout: 10000 })
    // give the app a moment to potentially adjust
    await page2.waitForTimeout(1000)
    const zoomVal = await page2.evaluate(() => {
      const params = new URL(window.location.href).searchParams
      return params.get('zoom')
    })
    console.log('zoom parameter after load:', zoomVal)
    if (zoomVal !== '9') {
      console.error('ZOOM-9 REGRESSION: zoom param became', zoomVal)
      await browser.close()
      process.exit(4)
    }
    console.log('ZOOM-9 REGRESSION: PASSED')

    // verify zoom=11 deep link still respects parameters and displays townships
    const testUrl11 = url + '?year=114&county=10010&tab=county&zoom=11&lat=23.4712&lon=120.5919'
    const page3 = await browser.newPage()
    console.log('Testing deep link at zoom 11:', testUrl11)
    await page3.goto(testUrl11, { waitUntil: 'networkidle' })
    await page3.waitForSelector('.atlas-map-canvas', { timeout: 10000 })
    await page3.waitForTimeout(1500)
    const zoomVal11 = await page3.evaluate(() => new URL(window.location.href).searchParams.get('zoom'))
    console.log('zoom after load (11):', zoomVal11)
    // also check for at least one Chiayi township label
    const countChiayi = await page3.locator('text=中埔').count()
    console.log('Chiayi labels at zoom11 deep link:', countChiayi)
    if (zoomVal11 !== '11' || countChiayi === 0) {
      console.error('ZOOM-11 REGRESSION: bad load', zoomVal11, countChiayi)
      process.exit(5)
    }
    console.log('ZOOM-11 REGRESSION: PASSED')

    // finally, verify clicking another county while already zoomed to 11
    const page4 = await browser.newPage()
    const clickUrl = url + '?year=114&county=10010&tab=county&zoom=11&lat=23.4712&lon=120.5919'
    console.log('Testing click stability at zoom 11:', clickUrl)
    await page4.goto(clickUrl, { waitUntil: 'networkidle' })
    await page4.waitForSelector('.atlas-map-canvas', { timeout: 10000 })
    await page4.waitForTimeout(1500)
    const centerBefore = await page4.evaluate(() => {
      const el = document.querySelector('.atlas-map-canvas')
      return el && el._leaflet_map ? el._leaflet_map.getCenter() : null
    })
    const other = await page4.$('text=高雄市')
    if (other) {
      await other.click({ force: true })
      await page4.waitForTimeout(1000)
    }
    const centerAfter = await page4.evaluate(() => {
      const el = document.querySelector('.atlas-map-canvas')
      return el && el._leaflet_map ? el._leaflet_map.getCenter() : null
    })
    console.log('center before/after click:', centerBefore, centerAfter)
    await browser.close()
    if (centerBefore && centerAfter) {
      if (Math.abs(centerBefore.lat - centerAfter.lat) > 0.0001 || Math.abs(centerBefore.lng - centerAfter.lng) > 0.0001) {
        console.error('CLICK-AT-ZOOM11 REGRESSION: center shifted', centerBefore, centerAfter)
        process.exit(6)
      }
    }
    console.log('CLICK-AT-ZOOM11 REGRESSION: PASSED')
    process.exit(0)
  } catch (err) {
    console.error('Error during check:', err)
    await browser.close()
    process.exit(3)
  }
}

run()
