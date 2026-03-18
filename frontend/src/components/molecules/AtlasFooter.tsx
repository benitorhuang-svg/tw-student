type AtlasFooterProps = {
  refreshStatus: string | null
  onToggleGovernance: () => void
  isGovernanceOpen: boolean
  anomalyCount?: number
}

const SOURCE_LINKS = [
  {
    href: 'https://depart.moe.edu.tw/ed4500/News.aspx?n=5A930C32CC6C3818&sms=91B3AAE8C6388B96',
    label: '統計處最新公告',
  },
  {
    href: 'https://stats.moe.gov.tw/edugissys/',
    label: '教育 GIS 圖表',
  },
  {
    href: 'https://www.nlsc.gov.tw/',
    label: '內政部國土測繪中心',
  },
]

function AtlasFooter({ onToggleGovernance, isGovernanceOpen, anomalyCount = 0 }: Omit<AtlasFooterProps, 'refreshStatus'>) {
  return (
    <footer id="atlas-app-footer" className="footer-note footer-note--official">
      <div className="footer-note__left">
        <button
          id="footer-governance-toggle"
          type="button"
          className={`rank-pill footer-governance-pill ${isGovernanceOpen ? 'footer-governance-pill--active' : ''} ${anomalyCount > 0 ? 'footer-governance-pill--alert' : ''}`}
          onClick={(event) => {
            event.stopPropagation()
            console.log('Governance toggle clicked, currently open=', isGovernanceOpen)
            onToggleGovernance()
          }}
          aria-haspopup="dialog"
          aria-expanded={isGovernanceOpen}
          aria-controls="governance-flyout-panel"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="footer-governance-icon">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>資料治理</span>
          {anomalyCount > 0 && (
            <span className="footer-governance-badge" title={`${anomalyCount} 個監控項目，點擊查看詳情`}>
              {anomalyCount}
            </span>
          )}
        </button>
        <span className="footer-sources__label">資料來源:</span>
        <div className="footer-sources">
          {SOURCE_LINKS.map((source) => (
            <a key={source.href} href={source.href} target="_blank" rel="noreferrer">
              {source.label}
            </a>
          ))}
        </div>
      </div>
      <div className="footer-note__right">
        {/* Refresh status hidden as requested */}
      </div>
    </footer>
  )
}

export default AtlasFooter