import type { AtlasTheme } from '../lib/constants'

type DashboardHeaderProps = {
  theme: AtlasTheme
  onToggleTheme: () => void
  isRefreshingData: boolean
  onRefreshData: () => Promise<void>
  generatedAtLabel: string
}

function DashboardHeader({
  theme,
  onToggleTheme,
  isRefreshingData,
  onRefreshData,
  generatedAtLabel,
}: DashboardHeaderProps) {
  // Extract just the date part if it's in YYYY/M/D HH:mm:ss format
  const dateOnly = generatedAtLabel.split(' ')[0]
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
          <h1>Taiwan Education Atlas</h1>
        </div>
      </div>

      <div className="dashboard-header__right">
        <div className="header-status-group">
          <button
            type="button"
            className="header-refresh-button"
            onClick={() => void onRefreshData()}
            disabled={isRefreshingData}
          >
            {isRefreshingData ? '正在同步' : '資料更新'}
          </button>
          <span className="header-last-update">
            最後更新日: {dateOnly}
          </span>
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader
