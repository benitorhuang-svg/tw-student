export function number(value) {
  if (value == null) return 0
  const normalized = String(value)
    .replace(/,/g, '')
    .replace(/[^\d.-]/g, '')
    .trim()
  if (!normalized) return 0
  return Number.parseInt(normalized, 10) || 0
}

export function normalizeText(value) {
  return String(value ?? '')
    .replace(/^\ufeff/, '')
    .replace(/^\[[^\]]+\]/, '')
    .replace(/^\d+\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/台/g, '臺')
    .trim()
}

export function normalizeCountyName(value) {
  return normalizeText(value)
}

export function normalizeTownName(value) {
  return normalizeText(value)
}

export function normalizeSchoolCode(value) {
  return String(value ?? '').replace(/^\ufeff/, '').trim()
}

export function shortCountyLabel(countyName) {
  if (countyName === '新北市') return '新北'
  if (countyName === '新竹市') return '竹市'
  if (countyName === '新竹縣') return '竹縣'
  if (countyName === '嘉義市') return '嘉市'
  if (countyName === '嘉義縣') return '嘉縣'
  return countyName.replace(/縣|市/g, '')
}

export function toCountyDetailFile(countyId) {
  return `${countyId}.json`
}

export function toCountyBucketFile(countyId) {
  return `${countyId}.json`
}

export function summaryBucketKey(educationLevel, managementType) {
  return `${educationLevel}|${managementType}`
}
