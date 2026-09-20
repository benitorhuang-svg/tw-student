import { number } from '../refresh-helpers.mjs'

/**
 * 依據教育部統計處《各教育階段學生數預測報告（115~130學年度）》
 * 115 學年度適齡入學人口與少子化趨勢修正率
 */
export const PROJECTION_FACTORS = {
  國小新生修正率: 0.962, // 115 小一新生較 114 下降約 3.8%
  國中新生修正率: 0.975, // 115 國一新生較 114 下降約 2.5%
  國小每班基準人數: 29,
  國中每班基準人數: 30,
}

/**
 * 國小世代升級推估 (Grade-Progression Projection for Elementary Schools)
 * 114年: 1->2, 2->3, 3->4, 4->5, 5->6 (6年級畢業)
 * 115年小一新生: 由114年小一規模乘上少子化修正率
 */
export function projectElementaryRow(sourceRow, targetYear) {
  const factor = PROJECTION_FACTORS.國小新生修正率

  const oldG1M = number(sourceRow['1年級男學生數'])
  const oldG1F = number(sourceRow['1年級女學生數'])
  const oldG2M = number(sourceRow['2年級男學生數'])
  const oldG2F = number(sourceRow['2年級女學生數'])
  const oldG3M = number(sourceRow['3年級男學生數'])
  const oldG3F = number(sourceRow['3年級女學生數'])
  const oldG4M = number(sourceRow['4年級男學生數'])
  const oldG4F = number(sourceRow['4年級女學生數'])
  const oldG5M = number(sourceRow['5年級男學生數'])
  const oldG5F = number(sourceRow['5年級女學生數'])

  // 115 年 1 年級 (新生推估)
  const newG1M = oldG1M > 0 ? Math.max(1, Math.round(oldG1M * factor)) : 0
  const newG1F = oldG1F > 0 ? Math.max(1, Math.round(oldG1F * factor)) : 0

  // 晉升 2~6 年級
  const newG2M = oldG1M
  const newG2F = oldG1F
  const newG3M = oldG2M
  const newG3F = oldG2F
  const newG4M = oldG3M
  const newG4F = oldG3F
  const newG5M = oldG4M
  const newG5F = oldG4F
  const newG6M = oldG5M
  const newG6F = oldG5F

  const calcClasses = (m, f) => {
    const total = m + f
    return total > 0 ? Math.max(1, Math.ceil(total / PROJECTION_FACTORS.國小每班基準人數)) : 0
  }

  return {
    ...sourceRow,
    學年度: String(targetYear),
    '1年級班級數': String(calcClasses(newG1M, newG1F)),
    '2年級班級數': String(calcClasses(newG2M, newG2F)),
    '3年級班級數': String(calcClasses(newG3M, newG3F)),
    '4年級班級數': String(calcClasses(newG4M, newG4F)),
    '5年級班級數': String(calcClasses(newG5M, newG5F)),
    '6年級班級數': String(calcClasses(newG6M, newG6F)),
    '1年級男學生數': String(newG1M),
    '1年級女學生數': String(newG1F),
    '2年級男學生數': String(newG2M),
    '2年級女學生數': String(newG2F),
    '3年級男學生數': String(newG3M),
    '3年級女學生數': String(newG3F),
    '4年級男學生數': String(newG4M),
    '4年級女學生數': String(newG4F),
    '5年級男學生數': String(newG5M),
    '5年級女學生數': String(newG5F),
    '6年級男學生數': String(newG6M),
    '6年級女學生數': String(newG6F),
    _isEstimated: true,
  }
}

/**
 * 國中世代升級推估 (Grade-Progression Projection for Junior High Schools)
 * 114年: 7->8, 8->9 (9年級畢業)
 * 115年國一新生 (7年級): 由114年7年級乘上少子化修正率
 */
export function projectJuniorRow(sourceRow, targetYear) {
  const factor = PROJECTION_FACTORS.國中新生修正率

  const oldG7M = number(sourceRow['學生數7年級男'])
  const oldG7F = number(sourceRow['學生數7年級女'])
  const oldG8M = number(sourceRow['學生數8年級男'])
  const oldG8F = number(sourceRow['學生數8年級女'])

  // 115 年 7 年級新生推估
  const newG7M = oldG7M > 0 ? Math.max(1, Math.round(oldG7M * factor)) : 0
  const newG7F = oldG7F > 0 ? Math.max(1, Math.round(oldG7F * factor)) : 0

  // 晉升 8~9 年級
  const newG8M = oldG7M
  const newG8F = oldG7F
  const newG9M = oldG8M
  const newG9F = oldG8F

  return {
    ...sourceRow,
    學年度: String(targetYear),
    學生數7年級男: String(newG7M),
    學生數7年級女: String(newG7F),
    學生數8年級男: String(newG8M),
    學生數8年級女: String(newG8F),
    學生數9年級男: String(newG9M),
    學生數9年級女: String(newG9F),
    _isEstimated: true,
  }
}
