import { type DataManifest, type ValidationReport } from '../../data/educationTypes'

export function formatBytes(bytes: number | undefined) {
  if (!bytes) {
    return '未提供'
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function formatValidationStatus(validationReport: ValidationReport | null) {
  if (!validationReport) return '尚未載入'
  if (validationReport.overallStatus === 'fail') return '阻擋異常'
  if (validationReport.overallStatus === 'warning') return '含警示'
  return '通過'
}

export function formatVersionLabel(manifest: DataManifest | null) {
  if (!manifest) return '尚未載入'
  return `${new Date(manifest.generatedAt).toLocaleString('zh-TW')} / ${manifest.buildId}`
}
