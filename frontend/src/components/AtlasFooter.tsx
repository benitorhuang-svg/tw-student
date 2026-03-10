type AtlasFooterProps = {
  generatedAtLabel: string
  isRefreshingData: boolean
  refreshStatus: string | null
  onRefreshData: () => Promise<void>
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

function AtlasFooter({ generatedAtLabel, isRefreshingData, refreshStatus, onRefreshData, onToggleGovernance, isGovernanceOpen }: AtlasFooterProps) {
  return (
    <footer className="footer-note footer-note--official">
      <div className="footer-note__left">
        <div className="footer-refresh-cluster">
          <button
            type="button"
            className="footer-refresh-button"
            onClick={() => void onRefreshData()}
            disabled={isRefreshingData}
            title="重新同步目前已部署的 SQLite、縣市切片與邊界快取；若教育部釋出新學年，仍需先執行 npm run data:refresh 重新產製資料。"
          >
            {isRefreshingData ? '部署資料同步中...' : '重新載入部署資料'}
          </button>
          <span className="footer-refresh-hint">清除前端快取並重讀 atlas 資料庫</span>
        </div>
        <span className="footer-sources__label">資料來源:</span>
        <div className="footer-sources">
          {SOURCE_LINKS.map((source) => (
            <a key={source.href} href={source.href} target="_blank" rel="noreferrer">
              {source.label}
            </a>
          ))}
          <button type="button" className={isGovernanceOpen ? 'rank-pill rank-pill--active footer-governance-pill' : 'rank-pill footer-governance-pill'} onClick={onToggleGovernance}>
            資料治理
          </button>
        </div>
      </div>
      <div className="footer-note__right">
        {refreshStatus ? <span className="footer-refresh-status">{refreshStatus}</span> : null}
        <span>最後產製 {generatedAtLabel}</span>
      </div>
    </footer>
  )
}

export default AtlasFooter