import { expect, test } from '@playwright/test'

const yilanCountyId = '宜蘭縣'
const yilanTownshipId = '宜蘭縣:宜蘭市'

test('restores URL state by hydrating summary, county detail, and township slice', async ({ page }) => {
  const detailResponse = page.waitForResponse((response) => response.url().includes('/data/counties/%E5%AE%9C%E8%98%AD%E7%B8%A3.json'))
  const townshipResponse = page.waitForResponse((response) => response.url().includes('/data/townships/%E5%AE%9C%E8%98%AD%E7%B8%A3.topo.json'))

  await page.goto(`/?year=113&county=${encodeURIComponent(yilanCountyId)}&township=${encodeURIComponent(yilanTownshipId)}&level=${encodeURIComponent('全部')}`)

  await detailResponse
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

  const detailResponse = page.waitForResponse((response) => response.url().includes('/data/counties/%E5%AE%9C%E8%98%AD%E7%B8%A3.json'))
  const townshipResponse = page.waitForResponse((response) => response.url().includes('/data/townships/%E5%AE%9C%E8%98%AD%E7%B8%A3.topo.json'))

  await page.getByRole('button', { name: /宜蘭縣/ }).first().click()

  await detailResponse
  await townshipResponse

  await expect(page.getByTestId('scope-breadcrumbs')).toContainText('宜蘭縣')

  await page.getByRole('tab', { name: /學校/ }).click()
  await expect(page.getByTestId('school-detail-panel')).toContainText('宜蘭縣')
  await expect(page.locator('.atlas-map-panel h3')).toContainText('宜蘭縣', { timeout: 10000 })
  await expect(page.getByText('宜蘭市', { exact: false }).first()).toBeVisible()
})

test('shows anomaly notes after loading county details', async ({ page }) => {
  await page.goto(`/?county=${encodeURIComponent(yilanCountyId)}&township=${encodeURIComponent(yilanTownshipId)}`)

  await page.getByRole('tab', { name: /區域/ }).click()
  await expect(page.getByTestId('scope-notes')).toContainText('宜蘭市 有 3 所學校存在年度缺漏。')
  await expect(page.getByTestId('data-note').first()).toContainText('缺年度')
})