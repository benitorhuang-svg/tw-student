import type { DataNote, TrendRecord } from '@/shared/api/data/educationData'

export type DataStatus = {
  kind: 'official' | 'estimated' | 'carried' | 'missing' | 'loading' | 'unavailable' | 'not-applicable'
  label: string
  description: string
  hasValue: boolean
}

type DataStatusInput = {
  year: number
  value: number | null | undefined
  valueStatus?: TrendRecord['valueStatus']
  notes?: DataNote[]
  loading?: boolean
  error?: string | null
}

export function getYearValueStatus(record?: TrendRecord, markedMissing = false): TrendRecord['valueStatus'] {
  if (!record || markedMissing || record.isMissing) return 'missing'
  return record.valueStatus ?? (record.isEstimated ? 'estimated' : record.students === 0 ? 'zero' : 'official')
}

type ValuePoint = { year: number; value: number; valueStatus?: TrendRecord['valueStatus'] }

export function hasStudentValue(point?: ValuePoint) {
  return Boolean(point && Number.isFinite(point.value) && point.value >= 0 && point.valueStatus !== 'missing' && point.valueStatus !== 'year-not-applicable')
}

export function canCompareStudentValues(current?: ValuePoint, previous?: ValuePoint) {
  return hasStudentValue(current) && hasStudentValue(previous) && previous!.value > 0 && current!.year === previous!.year + 1
}

export function formatStudentValue(point?: ValuePoint) {
  return hasStudentValue(point) ? point!.value.toLocaleString('zh-TW') : '—'
}

export function describeDataStatus({ year, value, valueStatus, notes = [], loading, error }: DataStatusInput): DataStatus {
  const hasValue = value != null && Number.isFinite(value) && value >= 0
    && valueStatus !== 'missing' && valueStatus !== 'year-not-applicable'
  if (!hasValue && error) return { kind: 'unavailable', label: '暫時無法載入', description: error, hasValue: false }
  if (!hasValue && loading) return { kind: 'loading', label: '載入中', description: '正在載入這個範圍的學生資料。', hasValue: false }
  if (valueStatus === 'year-not-applicable') {
    return { kind: 'not-applicable', label: '年度不適用', description: '此年度不適用於這所學校。', hasValue: false }
  }
  if (!hasValue) return { kind: 'missing', label: '資料缺漏', description: '此年度沒有可用紀錄，未將缺漏視為零人。', hasValue: false }
  if (valueStatus === 'estimated') return { kind: 'estimated', label: '推估資料', description: '此年度紀錄標示為推估值。', hasValue: true }
  if (valueStatus === 'official' || valueStatus === 'zero') {
    return { kind: 'official', label: '實際統計', description: value === 0 ? '此年度有正式的零人紀錄。' : '此年度紀錄標示為正式統計。', hasValue: true }
  }
  const yearNotes = notes.filter((note) => note.years?.includes(year))
  const carried = yearNotes.find((note) => /沿用/.test(note.message))
  if (carried) return { kind: 'carried', label: '含沿用資料', description: carried.message, hasValue: true }
  const estimated = yearNotes.find((note) => /推估|估計/.test(note.message))
  if (estimated) return { kind: 'estimated', label: '含推估資料', description: estimated.message, hasValue: true }
  return { kind: 'official', label: '統計彙整', description: '依目前載入的統計資料彙整。', hasValue: true }
}
