import type { AcademicYear } from '../data/educationData'

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
  return `${toGregorianYear(Number(year))} 學年度`
}

export function formatAcademicYearCompact(year: AcademicYear | number) {
  return String(toGregorianYear(Number(year)))
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