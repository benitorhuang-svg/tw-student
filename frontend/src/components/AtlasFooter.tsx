type AtlasFooterProps = {
  generatedAtLabel: string
  isRefreshingData: boolean
  refreshStatus: string | null
  onRefreshData: () => Promise<void>
}

const SOURCE_LINKS = [
  {
    href: 'https://depart.moe.edu.tw/ED4500/',
    label: '教育部統計處',
  },
  {
    href: 'https://stats.moe.gov.tw/edugis/',
    label: '教育 GIS',
  },
  {
    href: 'https://www.nlsc.gov.tw/',
    label: '內政部國土測繪中心',
  },
]

function AtlasFooter({ generatedAtLabel, isRefreshingData, refreshStatus, onRefreshData }: AtlasFooterProps) {
  return (
    <footer className="footer-note footer-note--official">
      <div className="footer-note__left">
        <button type="button" className="footer-refresh-button" onClick={() => void onRefreshData()} disabled={isRefreshingData}>
          {isRefreshingData ? '資料更新中...' : '資料更新'}
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
        <span>{generatedAtLabel}</span>
      </div>
    </footer>
  )
}

export default AtlasFooter