import type { AcademicYear } from '../data/educationData'

type DashboardYearNavigatorProps = {
  activeYear: AcademicYear
  isYearPlaybackActive: boolean
  summaryYears: number[]
  onSetActiveYear: (year: AcademicYear) => void
  onTogglePlayback: () => void
}

function DashboardYearNavigator({
  activeYear,
  isYearPlaybackActive,
  summaryYears,
  onSetActiveYear,
  onTogglePlayback,
}: DashboardYearNavigatorProps) {
  const activeYearIndex = summaryYears.indexOf(activeYear)
  const hasPrevious = activeYearIndex > 0
  const hasNext = activeYearIndex >= 0 && activeYearIndex < summaryYears.length - 1

  return (
    <div className="dashboard-year-nav">
      <div className="dashboard-year-nav__stepper">
        {hasPrevious ? (
          <button
            type="button"
            className="ghost-button dashboard-year-nav__arrow"
            onClick={() => onSetActiveYear(summaryYears[activeYearIndex - 1] as AcademicYear)}
            aria-label="切換到上一學年"
          >
            ‹
          </button>
        ) : (
          <span className="dashboard-year-nav__spacer" aria-hidden="true" />
        )}

        <span className="dashboard-year-nav__value">{activeYear}</span>

        {hasNext ? (
          <button
            type="button"
            className="ghost-button dashboard-year-nav__arrow"
            onClick={() => onSetActiveYear(summaryYears[activeYearIndex + 1] as AcademicYear)}
            aria-label="切換到下一學年"
          >
            ›
          </button>
        ) : (
          <span className="dashboard-year-nav__spacer" aria-hidden="true" />
        )}
      </div>

      <button
        type="button"
        className={isYearPlaybackActive ? 'ghost-button ghost-button--active dashboard-year-nav__toggle' : 'ghost-button dashboard-year-nav__toggle'}
        onClick={onTogglePlayback}
      >
        {isYearPlaybackActive ? '停止播放' : '全部播放'}
      </button>
    </div>
  )
}

export default DashboardYearNavigator