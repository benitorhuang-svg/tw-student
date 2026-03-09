import { expect, test, type Page } from '@playwright/test'

const yilanCountyId = '宜蘭縣'
const yilanTownshipId = '宜蘭縣:宜蘭市'
const taichungCountyId = '臺中市'
const taichungBeitunTownshipId = '臺中市:北屯區'
const school193667Name = '市立松強國小'
const school193667Code = '193667'

const missingCoordinateCases = [
  { code: '033603', name: '市立仁德國小', county: '桃園市', address: '桃園市八德區仁德路320號(暫借仁德非營利幼兒園)', resolution: '地址解點', coordinates: '24.934330, 121.289205' },
  { code: '044687', name: '縣立文興國小', county: '新竹縣', address: '新竹縣竹北市高鐵九路88號', resolution: '地址解點', coordinates: '24.802387, 121.042191' },
  { code: '063603', name: '市立鹿陽國小', county: '臺中市', address: '臺中市沙鹿區保定路107號', resolution: '地址解點', coordinates: '24.210844, 120.564785' },
  { code: '111601', name: '私立玉秀雙語國小', county: '臺南市', address: '臺南市鹽水區朝琴路178號', resolution: '地址解點', coordinates: '23.324016, 120.275195' },
  { code: '114344', name: '市立沙崙國際高中', county: '臺南市', address: '臺南市歸仁區武東里歸仁六路2號', resolution: '地址解點', coordinates: '22.929066, 120.281558' },
  { code: '120320', name: '國立高科實驗高中', county: '高雄市', address: '高雄市楠梓區盛昌街161號', resolution: '地址解點', coordinates: '22.713617, 120.286899' },
  { code: school193667Code, name: school193667Name, county: '臺中市', address: '臺中市北屯區崇德九路198號', resolution: '人工校正', coordinates: '24.186995, 120.691423' },
] as const

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
})

async function waitForAtlasReady(page: Page) {
  await expect.poll(async () => {
    const appCount = await page.getByTestId('atlas-app').count()
    if (appCount > 0) {
      return 'ready'
    }

    const loadingCount = await page.getByRole('heading', { name: /正在載入台灣教育地圖與分析元件|正在載入教育部與官方行政區資料/ }).count()
    return loadingCount > 0 ? 'loading' : 'pending'
  }, { timeout: 20000 }).toBe('ready')

  await expect(page.getByTestId('atlas-app')).toBeVisible({ timeout: 20000 })
}

test('restores URL state by hydrating summary, county detail, and township slice', async ({ page }) => {
  const sqliteResponse = page.waitForResponse((response) => response.url().includes('/data/education-atlas.sqlite'))
  const townshipResponse = page.waitForResponse((response) => response.url().includes('/data/townships/%E5%AE%9C%E8%98%AD%E7%B8%A3.topo.json'))

  await page.goto(`/?year=113&county=${encodeURIComponent(yilanCountyId)}&township=${encodeURIComponent(yilanTownshipId)}&level=${encodeURIComponent('全部')}`)
  await waitForAtlasReady(page)

  await sqliteResponse
  await townshipResponse

  await expect(page.getByRole('navigation', { name: '地圖路徑' })).toContainText('宜蘭縣')
  await expect(page.getByRole('navigation', { name: '地圖路徑' })).toContainText('宜蘭市')
  await expect(page.getByTestId('map-selection-status')).toContainText('目前地圖聚焦：宜蘭縣')

  await page.getByRole('button', { name: /各校分析/ }).click()
  await expect(page.getByTestId('school-list')).toBeVisible()
})

test('restores lat lon and zoom deep-link viewport after hydration and reload', async ({ page }) => {
  const deepLinkUrl = `/?county=${encodeURIComponent(yilanCountyId)}&township=${encodeURIComponent(yilanTownshipId)}&zoom=12&lat=24.7570&lon=121.7530`

  await page.goto(deepLinkUrl)
  await waitForAtlasReady(page)

  await expect.poll(() => {
    const current = new URL(page.url())
    return `${current.searchParams.get('zoom')}|${current.searchParams.get('lat')}|${current.searchParams.get('lon')}`
  }).toBe('12|24.7570|121.7530')

  await page.reload({ waitUntil: 'domcontentloaded' })
  await waitForAtlasReady(page)
  await expect(page.getByRole('navigation', { name: '地圖路徑' })).toContainText('宜蘭縣')
  await expect(page.getByRole('navigation', { name: '地圖路徑' })).toContainText('宜蘭市')
  await expect.poll(() => {
    const current = new URL(page.url())
    return `${current.searchParams.get('zoom')}|${current.searchParams.get('lat')}|${current.searchParams.get('lon')}`
  }).toBe('12|24.7570|121.7530')
})

test('switching county loads the township slice and county detail on demand', async ({ page }) => {
  await page.goto('/')
  await waitForAtlasReady(page)
  await expect(page.getByTestId('map-selection-status')).toContainText('目前地圖聚焦：全台灣')

  const townshipResponse = page.waitForResponse((response) => response.url().includes('/data/townships/%E5%AE%9C%E8%98%AD%E7%B8%A3.topo.json'))

  await page.getByRole('button', { name: /^宜蘭 52,344$/ }).click()

  await townshipResponse

  await expect(page.getByRole('navigation', { name: '地圖路徑' })).toContainText('宜蘭縣')
  await expect(page.getByTestId('map-selection-status')).toContainText('目前地圖聚焦：宜蘭縣')

  await page.getByRole('button', { name: /各校分析/ }).click()
  await expect(page.getByTestId('school-detail-panel')).toContainText('宜蘭縣')
  await expect(page.getByText('宜蘭市', { exact: false }).first()).toBeVisible()
})

test('shows anomaly findings after loading county details', async ({ page }) => {
  await page.goto(`/?county=${encodeURIComponent('彰化縣')}&tab=schools`)
  await waitForAtlasReady(page)

  await page.getByRole('button', { name: '資料治理' }).click()
  await expect(page.getByRole('dialog', { name: '資料治理面板' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '異常資料調查面板' })).toBeVisible()
  await expect(page.getByRole('button', { name: /彰化縣 \/ 異常值|竹塘鄉 \/ 異常值|縣立民靖國小/ }).first()).toBeVisible()
  await expect(page.getByTestId('data-note').first()).toContainText('異常值')
})

test('academic year uses dropdown and breadcrumb reset returns to overview', async ({ page }) => {
  await page.goto(`/?county=${encodeURIComponent(yilanCountyId)}&tab=schools`)
  await waitForAtlasReady(page)

  await expect(page.getByRole('combobox', { name: '學年度' })).toBeVisible()
  await page.getByRole('combobox', { name: '學年度' }).selectOption('111')
  await expect(page).toHaveURL(/year=111/)

  await expect(page.getByRole('navigation', { name: '地圖路徑' })).toContainText('宜蘭縣')
  await page.getByRole('navigation', { name: '地圖路徑' }).getByRole('button', { name: '全台' }).click()

  await expect(page.getByRole('button', { name: /全台總覽/ })).toBeVisible()
  await expect(page.getByTestId('map-selection-status')).toContainText('目前地圖聚焦：全台灣')
})

test('taichung schools view loads more than university-only records', async ({ page }) => {
  await page.goto(`/?county=${encodeURIComponent('臺中市')}&tab=schools&level=${encodeURIComponent('全部')}`)
  await waitForAtlasReady(page)

  await expect(page.getByRole('heading', { name: '臺中市 重點學校' })).toBeVisible()
  await expect(page.getByRole('button', { name: /載入更多/ })).toBeVisible()
})

test('school 193667 search, map focus, and governance workbook stay in sync', async ({ page }) => {
  await page.goto(`/?county=${encodeURIComponent(taichungCountyId)}&tab=schools&level=${encodeURIComponent('全部')}`)
  await waitForAtlasReady(page)

  await page.getByTestId('dashboard-search-input').fill(school193667Code)
  await expect(page).toHaveURL(/search=193667/)
  await expect(page).toHaveURL(/county=%E8%87%BA%E4%B8%AD%E5%B8%82/)
  await expect(page).not.toHaveURL(/township=/)

  await expect(page.getByTestId('school-focus-panel')).toContainText(school193667Name)
  await expect(page.getByTestId('school-focus-panel')).toContainText(school193667Code)
  await expect(page.getByTestId('school-focus-panel')).toContainText('臺中市北屯區崇德九路198號')
  await expect(page.getByRole('navigation', { name: '地圖路徑' })).toContainText('臺中市')
  await expect(page.getByRole('navigation', { name: '地圖路徑' })).not.toContainText('北屯區')
  await expect(page.getByTestId('map-selection-status')).toContainText(`目前地圖聚焦：${school193667Name}`)
  await expect(page.locator('.atlas-school-marker-193667')).toBeVisible()
  await expect.poll(() => {
    const current = new URL(page.url())
    return `${current.searchParams.get('lat')}|${current.searchParams.get('lon')}`
  }).toBe('24.1870|120.6914')

  await page.getByRole('button', { name: '資料治理' }).click()
  await expect(page.getByRole('dialog', { name: '資料治理面板' })).toBeVisible()
  await expect(page.getByTestId(`missing-coordinate-${school193667Code}`)).toContainText(school193667Name)
  await expect(page.getByTestId(`missing-coordinate-${school193667Code}`)).toContainText('人工校正')
  await expect(page.getByTestId(`missing-coordinate-${school193667Code}`)).toContainText('24.186995, 120.691423')
})

test('county-level school selection still shows the focused school marker', async ({ page }) => {
  await page.goto(`/?county=${encodeURIComponent(taichungCountyId)}&tab=schools&level=${encodeURIComponent('全部')}`)
  await waitForAtlasReady(page)

  await page.getByTestId('dashboard-search-input').fill(school193667Name)
  await page.locator('[data-testid="school-list"] tbody tr').filter({ hasText: school193667Name }).click()

  await expect(page.getByTestId('school-focus-panel')).toContainText(school193667Name)
  await expect(page.locator('.atlas-school-marker-193667')).toBeVisible()
  await expect(page.getByRole('navigation', { name: '地圖路徑' })).toContainText('臺中市')
})

test('breadcrumb county step returns township focus to county scope without resetting the model', async ({ page }) => {
  await page.goto(`/?county=${encodeURIComponent(taichungCountyId)}&township=${encodeURIComponent(taichungBeitunTownshipId)}&tab=schools`)
  await waitForAtlasReady(page)

  const breadcrumb = page.getByRole('navigation', { name: '地圖路徑' })
  await expect(breadcrumb).toContainText('臺中市')
  await expect(breadcrumb).toContainText('北屯區')

  await breadcrumb.getByRole('button', { name: '臺中市' }).click()

  await expect(page).toHaveURL(/county=%E8%87%BA%E4%B8%AD%E5%B8%82/)
  await expect(page).not.toHaveURL(/township=/)
  await expect(breadcrumb).toContainText('臺中市')
  await expect(breadcrumb).not.toContainText('北屯區')
  await expect(page.getByRole('heading', { name: '臺中市 教育結構' })).toBeVisible()
})

test('clicking Princeton marker switches map focus away from Renmei', async ({ page }) => {
  await page.goto(`/?county=${encodeURIComponent(taichungCountyId)}&township=${encodeURIComponent(taichungBeitunTownshipId)}&tab=schools&zoom=14&lat=24.1850&lon=120.6860`)
  await waitForAtlasReady(page)

  await expect(page.getByRole('heading', { name: '北屯區 學校清單' })).toBeVisible()
  await page.locator('[data-testid="school-list"] tbody tr').filter({ hasText: '市立仁美國小' }).click()
  await expect(page.getByTestId('map-selection-status')).toContainText('目前地圖聚焦：市立仁美國小')

  await page.locator('.atlas-school-marker-191605').click({ force: true })
  await expect(page.getByTestId('map-selection-status')).toContainText('目前地圖聚焦：私立明道普霖斯頓小學')
  await expect(page.getByTestId('school-focus-panel')).toContainText('私立明道普霖斯頓小學')
  await expect(page.getByTestId('school-focus-panel')).toContainText('191605')
})

test('clicking blank map clears selected school focus and returns to a broader school workspace', async ({ page }) => {
  await page.goto(`/?county=${encodeURIComponent(taichungCountyId)}&township=${encodeURIComponent(taichungBeitunTownshipId)}&tab=schools&zoom=14&lat=24.1850&lon=120.6860`)
  await waitForAtlasReady(page)

  await expect(page.getByRole('heading', { name: '北屯區 學校清單' })).toBeVisible()
  await page.locator('[data-testid="school-list"] tbody tr').filter({ hasText: school193667Name }).click()
  await expect(page.getByTestId('map-selection-status')).toContainText(`目前地圖聚焦：${school193667Name}`)
  await expect(page.getByTestId('school-focus-panel')).toContainText(school193667Code)

  await page.locator('.atlas-map-canvas').click({ position: { x: 24, y: 140 } })

  await expect(page.getByTestId('school-focus-panel')).toHaveCount(0)
  await expect(page.getByTestId('school-detail-panel')).toContainText('學校工作台')
  await expect(page.getByTestId('school-detail-panel')).toContainText('學校清單')
})

test('all seven missing GIS schools keep search, map focus, and governance metadata aligned', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.removeItem('atlas.coordinate-workflow'))
  await page.goto('/?tab=schools&level=%E5%85%A8%E9%83%A8')
  await waitForAtlasReady(page)

  for (const school of missingCoordinateCases) {
    await page.getByTestId('dashboard-search-input').fill(school.code)
    await expect(page).toHaveURL(new RegExp(`search=${school.code}`))
    await expect(page).not.toHaveURL(/township=/)

    await expect(page.getByTestId('school-focus-panel')).toContainText(school.name)
    await expect(page.getByTestId('school-focus-panel')).toContainText(school.code)
    await expect(page.getByTestId('school-focus-panel')).toContainText(school.address)
    await expect(page.getByTestId('map-selection-status')).toContainText(`目前地圖聚焦：${school.name}`)

    await page.getByRole('button', { name: '資料治理' }).click()
    const governanceItem = page.getByTestId(`missing-coordinate-${school.code}`)
    await expect(governanceItem).toContainText(school.name)
    await expect(governanceItem).toContainText(school.resolution)
    await expect(governanceItem).toContainText(school.coordinates)
    await page.getByRole('button', { name: '關閉', exact: true }).click()
  }
})

test('shows footer source links and map help overlay', async ({ page }) => {
  await page.goto(`/?county=${encodeURIComponent('彰化縣')}&tab=schools`)
  await waitForAtlasReady(page)

  await page.getByRole('contentinfo').scrollIntoViewIfNeeded()
  await expect(page.getByRole('link', { name: '統計處最新公告' })).toBeVisible()
  await expect(page.getByRole('link', { name: '教育 GIS 圖表' })).toBeVisible()
  await expect(page.getByRole('link', { name: '內政部國土測繪中心' })).toBeVisible()

  await page.getByTestId('map-help-toggle').click()
  await expect(page.getByText('探索提示')).toBeVisible()
  await expect(page.getByText('圖例說明')).toBeVisible()

  await page.getByRole('button', { name: '資料治理' }).click()
  await expect(page.getByRole('dialog', { name: '資料治理面板' })).toBeVisible()
  await expect(page.getByRole('link', { name: '教育部統計處正式檔案' })).toBeVisible()
})

test('chart tabs switch across overview and school focus without regression', async ({ page }) => {
  await page.goto(`/?county=${encodeURIComponent(yilanCountyId)}&township=${encodeURIComponent(yilanTownshipId)}&tab=overview`)
  await waitForAtlasReady(page)

  await expect(page.getByText('全台各學制歷年學生數')).toBeVisible()
  await page.locator('[aria-label="全台總覽圖表切換"]').getByRole('tab', { name: '學校量體' }).click()
  await expect(page.getByText('縣市量體與年度變動')).toBeVisible()

  await page.getByRole('button', { name: /各校分析/ }).click()
  await expect(page.getByTestId('school-list')).toBeVisible()
  await page.locator('[data-testid="school-list"] tbody tr').first().click()
  await page.locator('[aria-label="校別概況分頁"]').getByRole('tab', { name: '校別概況' }).click()
  await expect(page.getByTestId('school-focus-panel')).toBeVisible()
  await page.locator('[aria-label="單校圖表分頁"]').getByRole('tab', { name: '校別趨勢' }).click()
  await expect(page.getByText('趨勢切換')).toBeVisible()
})

test('scenario export and import keep favorite scenarios available', async ({ page }) => {
  await page.goto('/?tab=regional')
  await waitForAtlasReady(page)

  await page.getByRole('button', { name: /區域分析/ }).click()
  await page.locator('.comparison-panel__chips').getByText('彰化縣', { exact: true }).click()
  await page.locator('.comparison-panel__chips').getByText('桃園市', { exact: true }).click()
  await page.getByRole('button', { name: '收藏目前情境' }).click()
  await expect(page.getByText(/已收藏情境：/)).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '匯出 JSON' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('atlas-comparison-scenarios.json')

  await page.evaluate(() => window.localStorage.removeItem('tw-atlas-comparison-favorites'))
  await page.reload()
  await waitForAtlasReady(page)
  await expect(page.getByText('尚未收藏情境')).toBeVisible()

  await page.locator('input[type="file"]').setInputFiles({
    name: 'atlas-comparison-scenarios.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([
      {
        id: 'fixture-scenario',
        name: '東部對照',
        countyIds: ['宜蘭縣', '花蓮縣'],
        activeYear: 114,
        educationLevel: '全部',
        managementType: '全部',
        updatedAt: new Date().toISOString(),
      },
    ], null, 2)),
  })

  await expect(page.getByText('已匯入 1 筆情境')).toBeVisible()
  await expect(page.getByRole('button', { name: /東部對照/ })).toBeVisible()
})

test('education level filter narrows schools to selected level', async ({ page }) => {
  await page.goto(`/?county=${encodeURIComponent(yilanCountyId)}&township=${encodeURIComponent(yilanTownshipId)}&tab=schools`)
  await waitForAtlasReady(page)

  await expect(page.getByRole('combobox', { name: '學制' })).toContainText('學制')
  await expect(page.getByRole('combobox', { name: '公私立' })).toContainText('公私立')
  await page.getByRole('combobox', { name: '學制' }).selectOption('國小')
  await expect(page).toHaveURL(/level=%E5%9C%8B%E5%B0%8F/)
  await expect(page.getByTestId('school-list')).toContainText('國小')
  await expect(page.getByTestId('school-list')).not.toContainText('高中職')
  await expect(page.getByTestId('school-list')).not.toContainText('大專院校')
})