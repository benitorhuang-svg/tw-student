import { execSync } from 'node:child_process'
import process from 'node:process'

export const TARGET_115_SOURCES = [
  {
    name: '國小校別資料',
    url: 'https://stats.moe.gov.tw/files/detail/115/115_basec.json',
    level: '國小',
  },
  {
    name: '國中校別資料',
    url: 'https://stats.moe.gov.tw/files/detail/115/115_basej.xlsx',
    level: '國中',
  },
  {
    name: '大專校院學生數',
    url: 'https://stats.moe.gov.tw/files/detail/115/115_student.xlsx',
    level: '大專院校',
  },
]

export async function probeMoe115Endpoints(fetchImpl = fetch) {
  const checkResults = []

  for (const target of TARGET_115_SOURCES) {
    try {
      const response = await fetchImpl(target.url, { method: 'HEAD' })
      const contentLength = Number(response.headers.get('content-length') ?? 0)
      const isAvailable = response.status === 200 && contentLength > 1000

      checkResults.push({
        name: target.name,
        level: target.level,
        url: target.url,
        status: response.status,
        contentLength,
        isAvailable,
      })
    } catch (error) {
      checkResults.push({
        name: target.name,
        level: target.level,
        url: target.url,
        status: 'ERROR',
        error: error.message,
        isAvailable: false,
      })
    }
  }

  const availableCount = checkResults.filter((r) => r.isAvailable).length
  const isOfficialReleased = availableCount > 0

  return {
    checkedAt: new Date().toISOString(),
    academicYear: 115,
    isOfficialReleased,
    availableCount,
    totalChecked: checkResults.length,
    results: checkResults,
    recommendation: isOfficialReleased
      ? '官方 115 學年度公務統計已上架，請啟動資料核實全量更新！'
      : '官方 115 學年度公務統計尚未公布，目前維持 115 世代升級推估模型 (is_estimated = 1)。',
  }
}

async function main() {
  const args = process.argv.slice(2)
  const shouldTrigger = args.includes('--trigger')

  console.log('[PROBE-115] 開始探測教育部統計處 115 學年度官方檔案伺服器...')
  const report = await probeMoe115Endpoints()
  console.log(JSON.stringify(report, null, 2))

  if (report.isOfficialReleased) {
    console.log('\n[ALERT] 檢測到教育部官方 115 學年度正式資料已上線！')
    if (shouldTrigger) {
      console.log('[ACTION] 啟動自動核實流程：觸發全量資料更新...')
      try {
        execSync('npm run data:refresh', { stdio: 'inherit' })
        console.log('[ACTION] 資料核實完成，已成功用官方 115 資料覆蓋推估層！')
      } catch (err) {
        console.error('[ERROR] 執行資料核實更新失敗：', err.message)
        process.exit(1)
      }
    } else {
      console.log('[HINT] 若要自動啟動核實更新，請加入 --trigger 參數或在排程中配置。')
    }
  } else {
    console.log('\n[STATUS] 教育部官方 115 正式資料尚未公布。系統持續維持 115 學年度升級推估資料。')
  }
}

if (process.argv[1]?.includes('probe-moe-115-release')) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
