type AtlasFooterProps = {
  refreshStatus: string | null
  onToggleGovernance: () => void
  isGovernanceOpen: boolean
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

function AtlasFooter({ refreshStatus, onToggleGovernance, isGovernanceOpen }: AtlasFooterProps) {
  return (
    <footer className="footer-note footer-note--official">
      <div className="footer-note__left">
        <button type="button" className={isGovernanceOpen ? 'rank-pill rank-pill--active footer-governance-pill' : 'rank-pill footer-governance-pill'} onClick={onToggleGovernance}>
          資料治理
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
        {refreshStatus ? <span className="footer-refresh-status">{refreshStatus}</span> : null}
      </div>
    </footer>
  )
}

export default AtlasFooter