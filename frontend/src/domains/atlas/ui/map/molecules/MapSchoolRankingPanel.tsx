import { memo, useEffect, useMemo, useRef } from 'react'
import type { SchoolMapPoint } from '../types'

type RankingMode = 'students' | 'growth' | 'decline'

type RankingOption = {
  value: RankingMode
  label: string
}

const RANKING_OPTIONS: RankingOption[] = [
  { value: 'students', label: '學生總人數' },
  { value: 'growth', label: '學生增加率' },
  { value: 'decline', label: '學生減少率' },
]

type MapSchoolRankingPanelProps = {
  schools: SchoolMapPoint[]
  mode: RankingMode
  showTabs?: boolean
  onChangeMode?: (mode: RankingMode) => void
  selectedSchoolId: string | null
  onSelectSchool: (schoolId: string) => void
}

function formatStudents(value: number) {
  return value >= 0 ? value.toLocaleString('zh-TW') : '未載入'
}

function formatDeltaRatio(value: number) {
  const percent = value * 100
  if (!Number.isFinite(percent)) return '-'
  return `${percent > 0 ? '+' : ''}${percent.toFixed(Math.abs(percent) >= 10 ? 0 : 1)}%`
}

function sortSchoolsByMode(mode: RankingMode, schools: SchoolMapPoint[]) {
  return [...schools]
    .filter((school) => Number.isFinite(school.currentStudents) && school.currentStudents >= 0
      && school.valueStatus !== 'missing' && school.valueStatus !== 'year-not-applicable'
      && (mode === 'students' || school.hasComparison === true))
    .sort((a, b) => {
      if (mode === 'growth') return b.deltaRatio - a.deltaRatio
      if (mode === 'decline') return a.deltaRatio - b.deltaRatio
      return b.currentStudents - a.currentStudents
    })
}

export const MapSchoolRankingPanel = memo(function MapSchoolRankingPanel({
  schools,
  mode,
  showTabs,
  onChangeMode,
  selectedSchoolId,
  onSelectSchool,
}: MapSchoolRankingPanelProps) {
  const selectedRowRef = useRef<HTMLButtonElement | null>(null)
  const listRef = useRef<HTMLOListElement | null>(null)
  const rows = useMemo(() => {
    const ranked = sortSchoolsByMode(mode, schools).map((school, index) => ({ school, rank: index + 1 }))
    const topTen = ranked.slice(0, 10)
    const selected = ranked.find((row) => row.school.id === selectedSchoolId)
    return selected && selected.rank > 10 ? [...topTen, selected] : topTen
  }, [mode, schools, selectedSchoolId])
  const selectedRank = rows.find((row) => row.school.id === selectedSchoolId)?.rank

  useEffect(() => {
    const list = listRef.current
    const selected = selectedRowRef.current
    if (!list || !selected) return
    const listBounds = list.getBoundingClientRect()
    const rowBounds = selected.getBoundingClientRect()
    if (rowBounds.top < listBounds.top || rowBounds.bottom > listBounds.bottom) {
      list.scrollTop += rowBounds.top - listBounds.top - (list.clientHeight - rowBounds.height) / 2
    }
  }, [mode, selectedSchoolId, selectedRank])

  if (rows.length === 0) return <p className="map-mobile-panel-group__empty" role="status">{schools.some((school) => school.currentStudents < 0) ? '學校人數載入中…' : mode === 'students' ? '目前範圍沒有可用的學生人數紀錄。' : '目前範圍沒有可比較的前一年度紀錄。'}</p>

  return (
    <section
      className="map-school-ranking"
      aria-label="學校前十排行與所選學校"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {showTabs && (
        <div className="map-school-ranking-head">
          <div className="map-school-ranking-controls">
            <div className="map-school-ranking-btn-group">
              {RANKING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`map-school-ranking-btn ${mode === option.value ? 'is-active' : ''}`}
                  onClick={() => onChangeMode?.(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <ol ref={listRef} className="map-school-ranking-list">
        {rows.map(({ school, rank }) => (
          <li key={school.id} value={rank} className="map-school-ranking-item">
            <button
              ref={school.id === selectedSchoolId ? selectedRowRef : undefined}
              type="button"
              className="map-school-ranking-row"
              data-active={school.id === selectedSchoolId ? 'true' : 'false'}
              aria-pressed={school.id === selectedSchoolId}
              onClick={() => onSelectSchool(school.id)}
            >
              <span className="map-school-ranking-rank">{rank}</span>
              <span className="map-school-ranking-main">
                <span className="map-school-ranking-name">{school.name}</span>
                <span className="map-school-ranking-meta">{school.id === selectedSchoolId ? `目前選取 · ${school.townshipName || school.educationLevel}` : school.townshipName || school.educationLevel}</span>
              </span>
              <span className="map-school-ranking-metric">
                <span>{formatStudents(school.currentStudents)}</span>
                <span data-trend={school.deltaRatio >= 0 ? 'up' : 'down'}>{school.hasComparison ? formatDeltaRatio(school.deltaRatio) : '無前年度資料'}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
})
