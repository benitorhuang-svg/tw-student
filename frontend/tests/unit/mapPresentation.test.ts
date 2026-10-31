import { describe, expect, it } from 'vitest'
import { describeDataStatus, canCompareStudentValues, formatStudentValue, getYearValueStatus } from '@/shared/lib/analytics/dataStatus'
import { EDUCATION_LEGEND, getEducationTheme } from '@/shared/lib/education/educationTheme'
import { selectMapLabels } from '@/shared/lib/utils/labelLayout'

describe('data presentation preserves missing and zero values', () => {
  it('shows official zero as a real value while hiding missing numeric placeholders', () => {
    expect(describeDataStatus({ year: 114, value: 0, valueStatus: 'zero' })).toMatchObject({ label: '實際統計', hasValue: true })
    expect(describeDataStatus({ year: 114, value: 0, valueStatus: 'missing' })).toMatchObject({ label: '資料缺漏', hasValue: false })
    expect(formatStudentValue({ year: 114, value: 0, valueStatus: 'missing' })).toBe('—')
    expect(formatStudentValue({ year: 114, value: 0, valueStatus: 'zero' })).toBe('0')
    expect(describeDataStatus({ year: 114, value: 0, valueStatus: 'year-not-applicable' })).toMatchObject({ label: '年度不適用', hasValue: false })
  })

  it('reports an unavailable school after loading fails and keeps known summary values', () => {
    expect(describeDataStatus({ year: 114, value: -1, loading: true })).toMatchObject({ kind: 'loading', hasValue: false })
    expect(describeDataStatus({ year: 114, value: -1, loading: true, error: 'offline' })).toMatchObject({ kind: 'unavailable', hasValue: false })
    expect(describeDataStatus({ year: 114, value: 100, loading: true, error: 'detail unavailable' })).toMatchObject({ hasValue: true })
  })

  it('uses record metadata before aggregate year notes and never infers estimates from a year cutoff', () => {
    const notes = [{ type: '其他' as const, severity: 'warning' as const, years: [115], message: '部分學制沿用前一年資料' }]
    expect(describeDataStatus({ year: 115, value: 10, notes }).kind).toBe('carried')
    expect(describeDataStatus({ year: 115, value: 10, valueStatus: 'official', notes }).kind).toBe('official')
    expect(describeDataStatus({ year: 114, value: 10, valueStatus: 'estimated' }).kind).toBe('estimated')
    expect(describeDataStatus({ year: 115, value: 10 }).kind).toBe('official')
  })

  it('does not compute growth through a missing, zero-baseline or nonconsecutive year', () => {
    const current = { year: 114, value: 100 }
    expect(canCompareStudentValues(current, { year: 113, value: 90 })).toBe(true)
    expect(canCompareStudentValues(current, { year: 113, value: 90, valueStatus: 'missing' })).toBe(false)
    expect(canCompareStudentValues(current, { year: 113, value: 0 })).toBe(false)
    expect(canCompareStudentValues(current, { year: 112, value: 90 })).toBe(false)
    expect(getYearValueStatus(undefined)).toBe('missing')
    expect(getYearValueStatus({ year: 114, students: 0 })).toBe('zero')
    expect(getYearValueStatus({ year: 114, students: 100 }, true)).toBe('missing')
  })
})

describe('label layout and education palette', () => {
  it('keeps selection before overlapping labels even when selection arrives last', () => {
    const labels = [
      { id: 'nearby', x: 40, y: 40, width: 80, height: 44, priority: 0 },
      { id: 'far', x: 240, y: 40, width: 80, height: 44, priority: 0 },
      { id: 'selected', x: 44, y: 40, width: 80, height: 44, priority: 1000 },
    ]
    expect([...selectMapLabels(labels)]).toEqual(['selected', 'far'])
  })

  it('uses label dimensions and retains explicitly protected neighboring areas', () => {
    const labels = [
      { id: 'city', x: 40, y: 40, width: 100, height: 44, priority: 1000 },
      { id: 'county', x: 60, y: 40, width: 100, height: 44, priority: 1000 },
    ]
    expect(selectMapLabels(labels).size).toBe(2)
  })

  it('keeps education colors independent of filtering, ordering and label aliases', () => {
    expect(getEducationTheme('大專')).toBe(getEducationTheme('大專院校'))
    expect(['高中職', '國小', '國中'].map((level) => getEducationTheme(level)?.color)).toEqual(['#f59e0b', '#22c55e', '#38bdf8'])
    expect(EDUCATION_LEGEND).toHaveLength(4)
    expect(getEducationTheme('公立')).toBeNull()
  })
})
