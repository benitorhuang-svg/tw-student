import type { CSSProperties, TransitionStartFunction } from 'react'

import type { AcademicYear, EducationLevelFilter, ManagementTypeFilter } from '../data/educationData'
import type { AtlasTheme } from '../lib/constants'
import { EDUCATION_LEVEL_OPTIONS, MANAGEMENT_TYPE_OPTIONS } from '../lib/constants'
import { formatAcademicYear } from '../lib/analytics'

type DashboardHeaderProps = {
  theme: AtlasTheme
  onToggleTheme: () => void
  activeYear: AcademicYear
  summaryYears: AcademicYear[]
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  searchText: string
  isPending: boolean
  onSetActiveYear: (year: AcademicYear) => void
  onSetEducationLevel: (level: EducationLevelFilter) => void
  onSetManagementType: (type: ManagementTypeFilter) => void
  onSetSearchText: (text: string) => void
  onStopPlayback: () => void
  startTransition: TransitionStartFunction
}

function DashboardHeader({
  theme,
  onToggleTheme,
  activeYear,
  summaryYears,
  educationLevel,
  managementType,
  searchText,
  isPending,
  onSetActiveYear,
  onSetEducationLevel,
  onSetManagementType,
  onSetSearchText,
  onStopPlayback,
  startTransition,
}: DashboardHeaderProps) {
  const buildSelectWidth = (labels: string[], extraCh = 2) => {
    const maxCh = Math.max(...labels.map((label) => label.length), 4) + extraCh
    return { '--dashboard-select-width': `calc(${maxCh}ch + 2.9rem)` } as CSSProperties
  }

  const yearWidthStyle = buildSelectWidth(summaryYears.map((year) => formatAcademicYear(year)), 1)
  const educationWidthStyle = buildSelectWidth(EDUCATION_LEVEL_OPTIONS.map((option) => option.label))
  const managementWidthStyle = buildSelectWidth(MANAGEMENT_TYPE_OPTIONS.map((option) => option.label))

  return (
    <header className="dashboard-header">
      <div className="dashboard-header__brand">
        <button
          type="button"
          className={theme === 'dark' ? 'theme-toggle theme-toggle--dark' : 'theme-toggle'}
          aria-label="切換亮暗模式"
          title="切換亮暗模式"
          onClick={onToggleTheme}
        >
          <span className="theme-toggle__icon" aria-hidden="true">{theme === 'dark' ? '☾' : '☼'}</span>
        </button>
        <div>
          <h1>Taiwan Education Atlas</h1>
        </div>
      </div>

      <div className="dashboard-header__control-stack">
        <div className="dashboard-header__filters">
          <label className="dashboard-inline-filter dashboard-inline-filter--auto dashboard-inline-filter--year" style={yearWidthStyle}>
            <select
              value={activeYear}
              data-testid="academic-year-select"
              className="dashboard-filter-select"
              aria-label="學年度"
              onChange={(event) => {
                onStopPlayback()
                startTransition(() => onSetActiveYear(Number(event.target.value) as AcademicYear))
              }}
            >
              {summaryYears.map((year) => (
                <option key={year} value={year}>{formatAcademicYear(year)}</option>
              ))}
            </select>
          </label>

          <label className="dashboard-inline-filter dashboard-inline-filter--auto" style={educationWidthStyle}>
            <select
              className="dashboard-filter-select"
              value={educationLevel}
              data-testid="education-level-select"
              aria-label="學制"
              onChange={(event) => startTransition(() => onSetEducationLevel(event.target.value as EducationLevelFilter))}
            >
              {EDUCATION_LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="dashboard-inline-filter dashboard-inline-filter--auto" style={managementWidthStyle}>
            <select
              className="dashboard-filter-select"
              value={managementType}
              data-testid="management-type-select"
              aria-label="公私立"
              onChange={(event) => startTransition(() => onSetManagementType(event.target.value as ManagementTypeFilter))}
            >
              {MANAGEMENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="dashboard-inline-filter dashboard-inline-filter--search">
            <input
              className="dashboard-filter-input"
              data-testid="dashboard-search-input"
              aria-label="搜尋"
              value={searchText}
              onChange={(e) => onSetSearchText(e.target.value)}
              placeholder="搜尋縣市 / 鄉鎮 / 學校 / 代碼"
            />
          </label>

          {isPending ? <span className="dashboard-pending-badge">更新中…</span> : null}
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader
