import { memo, useMemo, useState } from 'react'
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
    .filter((school) => Number.isFinite(school.currentStudents) && school.currentStudents >= 0)
    .sort((a, b) => {
      if (mode === 'growth') return b.deltaRatio - a.deltaRatio
      if (mode === 'decline') return a.deltaRatio - b.deltaRatio
      return b.currentStudents - a.currentStudents
    })
    .slice(0, 10)
}

export const MapSchoolRankingPanel = memo(function MapSchoolRankingPanel({
  schools,
  selectedSchoolId,
  onSelectSchool,
}: MapSchoolRankingPanelProps) {
  const [mode, setMode] = useState<RankingMode>('students')
  const rows = useMemo(() => sortSchoolsByMode(mode, schools), [mode, schools])

  if (rows.length === 0) return null

  return (
    <section
      className="map-school-ranking"
      aria-label="學校前十排行"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="map-school-ranking-head">
        <div className="map-school-ranking-controls">
          <div className="map-school-ranking-btn-group">
            {RANKING_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`map-school-ranking-btn ${mode === option.value ? 'is-active' : ''}`}
                onClick={() => setMode(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ol className="map-school-ranking-list">
        {rows.map((school, index) => (
          <li key={school.id} className="map-school-ranking-item">
            <button
              type="button"
              className="map-school-ranking-row"
              data-active={school.id === selectedSchoolId ? 'true' : 'false'}
              onClick={() => onSelectSchool(school.id)}
            >
              <span className="map-school-ranking-rank">{index + 1}</span>
              <span className="map-school-ranking-main">
                <span className="map-school-ranking-name">{school.name}</span>
                <span className="map-school-ranking-meta">{school.townshipName || school.educationLevel}</span>
              </span>
              <span className="map-school-ranking-metric">
                <span>{formatStudents(school.currentStudents)}</span>
                <span data-trend={school.deltaRatio >= 0 ? 'up' : 'down'}>{formatDeltaRatio(school.deltaRatio)}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
})
