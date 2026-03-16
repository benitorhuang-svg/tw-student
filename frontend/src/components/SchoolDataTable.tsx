import { useState } from 'react'

import { formatPercent, type SchoolInsight } from '../lib/analytics'
import SchoolTableRow from './molecules/SchoolTableRow'

type SchoolSortKey =
  | 'name'
  | 'currentStudents'
  | 'delta'
  | 'status'
  | 'educationLevel'
  | 'managementType'
  | 'townshipName'

type SchoolDataTableProps = {
  schools: SchoolInsight[]
  selectedSchoolId: string | null
  onSelectSchool: (schoolId: string) => void
  onHoverSchool?: (schoolId: string | null) => void
  scopeLabel: string
}

const statusRank: Record<string, number> = {
  待確認: 3,
  整併: 2,
  停辦: 2,
  正常: 1,
}

const sortableHeaders: Array<{ key: SchoolSortKey; label: string }> = [
  { key: 'name', label: '學校' },
  { key: 'townshipName', label: '鄉鎮' },
  { key: 'educationLevel', label: '學制' },
  { key: 'managementType', label: '公私立' },
  { key: 'currentStudents', label: '學生數' },
  { key: 'delta', label: '今年增減' },
  { key: 'status', label: '狀態' },
]

function compareSchoolRows(left: SchoolInsight, right: SchoolInsight, sortKey: SchoolSortKey, sortDirection: 'asc' | 'desc') {
  const direction = sortDirection === 'asc' ? 1 : -1

  switch (sortKey) {
    case 'currentStudents':
      return (left.currentStudents - right.currentStudents) * direction
    case 'delta':
      return (left.delta - right.delta) * direction
    case 'status':
      return ((statusRank[left.status ?? '正常'] ?? 0) - (statusRank[right.status ?? '正常'] ?? 0)) * direction
    default:
      return (left[sortKey] || '').localeCompare(right[sortKey] || '', 'zh-Hant') * direction
  }
}

function escapeCsv(value: string) {
  let safe = value
  // Prevent CSV formula injection — prefix formula-triggering characters
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = "'" + safe
  }
  const escaped = safe.replaceAll('"', '""')
  return `"${escaped}"`
}

const PAGE_SIZE = 50

function SchoolDataTable({ schools, selectedSchoolId, onSelectSchool, onHoverSchool, scopeLabel }: SchoolDataTableProps) {
  const [sortKey, setSortKey] = useState<SchoolSortKey>('currentStudents')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const sortedSchools = [...schools].sort((left, right) => compareSchoolRows(left, right, sortKey, sortDirection))
  const selectedSchool = selectedSchoolId ? sortedSchools.find((school) => school.id === selectedSchoolId) ?? null : null
  const visibleSchools = sortedSchools.slice(0, visibleCount)
  const hasMore = visibleCount < sortedSchools.length

  const handleSort = (nextSortKey: SchoolSortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(nextSortKey)
      setSortDirection(nextSortKey === 'name' || nextSortKey === 'townshipName' ? 'asc' : 'desc')
    }
    setVisibleCount(PAGE_SIZE)
  }

  const handleExport = () => {
    const header = ['學校', '代碼', '鄉鎮', '學制', '公私立', '學生數', '今年增減', '成長率', '狀態', '地址', '電話', '網站']
    const rows = sortedSchools.map((school) => [
      school.name,
      school.code,
      school.townshipName,
      school.educationLevel,
      school.managementType,
      String(school.currentStudents),
      String(school.delta),
      formatPercent(school.deltaRatio),
      school.status ?? '正常',
      school.address,
      school.phone,
      school.website,
    ])

    const csv = [header, ...rows]
      .map((row) => row.map((value) => escapeCsv(value)).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${scopeLabel}-學校表格.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (schools.length === 0) {
    return (
      <section className="school-table-panel">
        <div className="chart-empty-state">尚無學校資料</div>
      </section>
    )
  }

  return (
    <section className="school-table-panel">
      <div className="school-table-panel__toolbar">
        <div>
          <strong>{schools.length.toLocaleString('zh-TW')} 所學校</strong>
          <span>目前排序: {sortableHeaders.find((header) => header.key === sortKey)?.label ?? sortKey}</span>
        </div>
        <button
          type="button"
          className="ghost-button"
          onClick={handleExport}
          data-testid="school-export-button"
        >
          匯出 CSV
        </button>
      </div>

      <div className="school-table-wrap" data-testid="school-list">
        <table className="school-table">
          <thead>
            <tr>
              {sortableHeaders.map((header) => (
                <th key={header.key}>
                  <button type="button" className="school-table__sort" onClick={() => handleSort(header.key)}>
                    <span>{header.label}</span>
                    <span>{sortKey === header.key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleSchools.map((school) => (
              <SchoolTableRow
                key={school.id}
                school={school}
                isActive={school.id === selectedSchool?.id}
                onSelect={onSelectSchool}
                onHover={onHoverSchool || (() => {})}
              />
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="school-table-panel__loadmore">
          <button type="button" className="ghost-button" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
            載入更多（已顯示 {visibleCount} / {sortedSchools.length}）
          </button>
        </div>
      )}

      <div className="school-table-panel__footer">
        <span>顯示 {visibleSchools.length} / {sortedSchools.length} 所</span>
        <span>點擊列可同步地圖定位與更新分析狀態</span>
      </div>
    </section>
  )
}

export default SchoolDataTable