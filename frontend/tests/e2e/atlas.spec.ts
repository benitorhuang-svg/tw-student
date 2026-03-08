import { expect, test } from '@playwright/test'

const yilanCountyId = '宜蘭縣'
const yilanTownshipId = '宜蘭縣:宜蘭市'

test('restores URL state by hydrating summary, county detail, and township slice', async ({ page }) => {
  const sqliteResponse = page.waitForResponse((response) => response.url().includes('/data/education-atlas.sqlite'))
  const townshipResponse = page.waitForResponse((response) => response.url().includes('/data/townships/%E5%AE%9C%E8%98%AD%E7%B8%A3.topo.json'))

  await page.goto(`/?year=113&county=${encodeURIComponent(yilanCountyId)}&township=${encodeURIComponent(yilanTownshipId)}&level=${encodeURIComponent('全部')}`)

  await sqliteResponse
  await townshipResponse

  await expect(page.getByTestId('atlas-app')).toBeVisible()
  await expect(page.getByTestId('scope-breadcrumbs')).toContainText('宜蘭縣')
  await expect(page.getByTestId('scope-breadcrumbs')).toContainText('宜蘭市')
  await expect(page.getByTestId('current-scope-card')).toContainText('宜蘭市')

  await page.getByRole('tab', { name: /學校/ }).click()
  await expect(page.getByTestId('school-list')).toBeVisible()
})

test('switching county loads the township slice and county detail on demand', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('current-scope-card')).toContainText('全台灣')

  const townshipResponse = page.waitForResponse((response) => response.url().includes('/data/townships/%E5%AE%9C%E8%98%AD%E7%B8%A3.topo.json'))

  await page.getByRole('button', { name: /宜蘭縣/ }).first().click()

  await townshipResponse

  await expect(page.getByTestId('scope-breadcrumbs')).toContainText('宜蘭縣')

  await page.getByRole('tab', { name: /學校/ }).click()
  await expect(page.getByTestId('school-detail-panel')).toContainText('宜蘭縣')
  await expect(page.locator('.map-toolbar')).toContainText('宜蘭縣', { timeout: 10000 })
  await expect(page.getByText('宜蘭市', { exact: false }).first()).toBeVisible()
})

test('shows anomaly notes after loading county details', async ({ page }) => {
  await page.goto(`/?county=${encodeURIComponent(yilanCountyId)}&township=${encodeURIComponent(yilanTownshipId)}`)

  await page.getByRole('tab', { name: /區域/ }).click()
  await expect(page.getByTestId('scope-notes')).toContainText('宜蘭市 有 3 所學校存在年度缺漏。')
  await expect(page.getByTestId('data-note').first()).toContainText('缺年度')
})

test('academic year uses dropdown and reset scope returns to overview', async ({ page }) => {
  await page.goto('/?county=%E5%AE%9C%E8%98%AD%E7%B8%A3&tab=schools')

  await expect(page.getByTestId('academic-year-select')).toBeVisible()
  await page.getByTestId('academic-year-select').selectOption('111')
  await expect(page).toHaveURL(/year=111/)

  await expect(page.getByRole('tab', { name: /學校工作台/ })).toHaveAttribute('aria-selected', 'true')
  await page.getByTestId('reset-scope-button').click()

  await expect(page.getByRole('tab', { name: /概況總覽/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('current-scope-card')).toContainText('全台灣')
})

test('taichung schools view loads more than university-only records', async ({ page }) => {
  await page.goto(`/?county=${encodeURIComponent('臺中市')}&tab=schools&level=${encodeURIComponent('全部')}`)

  await expect(page.getByTestId('school-detail-panel')).toContainText('臺中市')
  await expect(page.getByRole('button', { name: /載入更多/ })).toBeVisible()
})

test('shows footer source links and map help overlay', async ({ page }) => {
  await page.goto(`/?county=${encodeURIComponent('彰化縣')}&tab=schools`)

  await expect(page.getByRole('button', { name: /資料更新/ })).toBeVisible()
  await expect(page.getByRole('link', { name: '教育部統計處' })).toBeVisible()
  await expect(page.getByRole('link', { name: '教育 GIS' })).toBeVisible()
  await expect(page.getByRole('link', { name: '內政部國土測繪中心' })).toBeVisible()

  await page.getByTestId('map-help-toggle').click()
  await expect(page.getByText('探索提示')).toBeVisible()
  await expect(page.getByText('圖例說明')).toBeVisible()
})