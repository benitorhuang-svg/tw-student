import React from 'react'

type GovernanceFooterProps = {
  isRefreshingData: boolean
  refreshStatus: string | null
  onRefreshData: () => Promise<void>
}

export const GovernanceFooter: React.FC<GovernanceFooterProps> = ({
  isRefreshingData,
  refreshStatus,
  onRefreshData,
}) => {
  return (
    <div className="governance-flyout__footer">
      <div className="sync-status">
        <span className={isRefreshingData ? 'sync-indicator sync-indicator--active' : 'sync-indicator'}></span>
        <div className="sync-info">
          <p>{isRefreshingData ? '' : '資料已與雲端同步'}</p>
          <small>{isRefreshingData ? '更新中...' : (refreshStatus || `最後檢查: ${new Date().toLocaleTimeString('zh-TW')}`)}</small>
        </div>
      </div>
      <button
        type="button"
        className={`premium-sync-button ${isRefreshingData ? 'is-loading' : ''}`}
        disabled={isRefreshingData}
        onClick={() => void onRefreshData()}
      >
        {isRefreshingData ? (
          <span className="button-loader">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="18" height="18">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            更新中...
          </span>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
              <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            立即同步最新資料
          </>
        )}
      </button>
    </div>
  )
}
