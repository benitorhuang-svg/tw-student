import type { AcademicYear } from '../../api/data/educationData'

export function formatStudents(value: number) {
  return value.toLocaleString('zh-TW')
}

export function formatDelta(delta: number) {
  const prefix = delta > 0 ? '+' : ''
  return `${prefix}${delta.toLocaleString('zh-TW')}`
}

export function formatPercent(deltaRatio: number) {
  const prefix = deltaRatio > 0 ? '+' : ''
  return `${prefix}${(deltaRatio * 100).toFixed(1)}%`
}

export function toGregorianYear(year: number) {
  return year + 1911
}

export function formatAcademicYear(year: AcademicYear | number) {
  const numericYear = Number(year)
  return `${numericYear}學年度 (${toGregorianYear(numericYear)}-${toGregorianYear(numericYear) + 1})`
}

export function formatAcademicYearCompact(year: AcademicYear | number) {
  return String(Number(year))
}

export function formatFileSize(bytes: number) {
  if (bytes <= 0) {
    return '0 B'
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * 年增減率色階 (Diverging Color Scale with Deadband Threshold):
 * 成長: Sky (藍色系)
 * 持平/中立: Slate (中性灰) - 消除微幅波動全盤泛紅問題
 * 衰退: Rose (紅色系)
 */
export function growthChoroplethColor(deltaRatio: number): string {
  const pct = deltaRatio * 100
  const absPct = Math.abs(pct)

  // ±0.5% 視為持平穩定
  if (absPct <= 0.5) {
    return '#64748b' // Slate-500
  }

  if (deltaRatio > 0) {
    if (pct >= 5) return '#0369a1' // Sky-700
    if (pct >= 2) return '#0284c7' // Sky-600
    return '#38bdf8'               // Sky-400
  } else {
    if (pct <= -5) return '#be123c' // Rose-700
    if (pct <= -2) return '#e11d48' // Rose-600
    return '#fb7185'                // Rose-400
  }
}

export function growthChoroplethOpacity(deltaRatio: number): number {
  const absPct = Math.abs(deltaRatio * 100)
  if (absPct <= 0.5) return 0.25
  if (absPct >= 10) return 0.76
  if (absPct >= 5) return 0.58
  if (absPct >= 2) return 0.42
  return 0.3
}
