import type { AcademicYear } from '../data/educationData'
import type { AtlasTheme } from '../lib/constants'

type DashboardHeaderProps = {
  theme: AtlasTheme
  activeYear?: AcademicYear
  summaryYears?: AcademicYear[]
  isYearPlaybackActive?: boolean
  onToggleTheme: () => void
  onSetActiveYear?: (year: AcademicYear) => void
  onStopPlayback?: () => void
  onTogglePlayback?: () => void
  startTransition?: React.TransitionStartFunction
}

function DashboardHeader({
  theme,
  activeYear,
  summaryYears = [],
  isYearPlaybackActive = false,
  onToggleTheme,
  onSetActiveYear,
  onStopPlayback,
  onTogglePlayback,
  startTransition,
}: DashboardHeaderProps) {
  const activeIdx = activeYear ? summaryYears.indexOf(activeYear) : -1
  const total = summaryYears.length

  const handleStep = (direction: number) => {
    if (!onSetActiveYear || !onStopPlayback || !startTransition || activeIdx === -1) return
    const nextIdx = activeIdx + direction
    if (nextIdx >= 0 && nextIdx < total) {
      onStopPlayback()
      startTransition(() => onSetActiveYear(summaryYears[nextIdx]))
    }
  }

  return (
    <header className="dashboard-header">
      <div className="dashboard-header__left">
        <button
          type="button"
          className={theme === 'dark' ? 'theme-toggle theme-toggle--dark' : 'theme-toggle'}
          aria-label="切換亮暗模式"
          title="切換亮暗模式"
          onClick={onToggleTheme}
        >
          <span className="theme-toggle__icon" aria-hidden="true">
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </span>
        </button>
        <div className="dashboard-header__logo">
          <h1>
            <span className="logo-text--primary">Taiwan</span>
            <span className="logo-text--secondary">Education Atlas</span>
          </h1>
        </div>
        
        {activeYear && (
          <div className="dashboard-header__year-stepper">
            <div className="stepper-controls">
              <button
                type="button"
                className="header-step-btn"
                disabled={activeIdx <= 0}
                onClick={() => handleStep(-1)}
                title="上一個學年度"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div className="dashboard-header__year">
                <span className="year-chip">{activeYear}學年度</span>
              </div>
              <button
                type="button"
                className="header-step-btn"
                disabled={activeIdx >= total - 1}
                onClick={() => handleStep(1)}
                title="下一個學年度"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
            
            <button
              type="button"
              className={isYearPlaybackActive ? 'header-playback-btn active' : 'header-playback-btn'}
              onClick={onTogglePlayback}
              title={isYearPlaybackActive ? '停止播放' : '播放年度變遷'}
            >
              {isYearPlaybackActive ? (
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export default DashboardHeader
