import React from 'react'

type GovernanceHeaderProps = {
  onClose: () => void
}

export const GovernanceHeader: React.FC<GovernanceHeaderProps> = ({ onClose }) => {
  return (
    <div className="governance-flyout__head">
      <div className="governance-flyout__head-content">
        <span className="premium-badge">Data Governance</span>
        <h3>資料治理與核心監控</h3>
        <p>本面板負責監測教育統計資料流、地理空間座標補件進度，以及自動化部署刷新之完整性校驗。</p>
      </div>
      <div className="governance-flyout__actions">
        <button type="button" className="close-trigger" onClick={onClose} aria-label="關閉">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
