import { formatFileSize } from '../lib/analytics'

type LoadObservation = {
  cacheHits: number
  memoryHits: number
  sqliteHits: number
  networkFetches: number
  totalTransferredBytes: number
  loadedCountyDetails: string[]
  loadedBucketSlices: string[]
  loadedTownshipSlices: string[]
}

type OfflineMetricsPanelProps = {
  loadObservation: LoadObservation
  offlineReadySlices: number
  totalCounties: number
  isOffline: boolean
}

function OfflineMetricsPanel({ loadObservation, offlineReadySlices, totalCounties, isOffline }: OfflineMetricsPanelProps) {
  const totalRequests = loadObservation.cacheHits + loadObservation.memoryHits + loadObservation.sqliteHits + loadObservation.networkFetches
  const cacheRatio = totalRequests > 0 ? (loadObservation.cacheHits + loadObservation.memoryHits + loadObservation.sqliteHits) / totalRequests : 0
  const coverageRatio = totalCounties > 0 ? offlineReadySlices / totalCounties : 0

  const rows = [
    { label: '快取命中', value: `${Math.round(cacheRatio * 100)}%`, ratio: cacheRatio },
    { label: '縣市覆蓋', value: `${offlineReadySlices}/${totalCounties}`, ratio: coverageRatio },
    { label: '傳輸量', value: formatFileSize(loadObservation.totalTransferredBytes), ratio: Math.min(loadObservation.totalTransferredBytes / (5 * 1024 * 1024), 1) },
    { label: '記憶體', value: `${loadObservation.memoryHits} 次`, ratio: totalRequests > 0 ? loadObservation.memoryHits / totalRequests : 0 },
    { label: 'SQLite', value: `${loadObservation.sqliteHits} 次`, ratio: totalRequests > 0 ? loadObservation.sqliteHits / totalRequests : 0 },
    { label: '網路請求', value: `${loadObservation.networkFetches} 次`, ratio: totalRequests > 0 ? loadObservation.networkFetches / totalRequests : 0 },
  ]

  return (
    <section className="dashboard-card offline-metrics-panel">
      <div className="dashboard-card__head">
        <div className="panel-heading__stack">
          <h3 className="dashboard-card__title">離線指標</h3>
          <p className="dashboard-card__subtitle">{isOffline ? '離線模式' : '快取狀態'}</p>
        </div>
      </div>
      <div className="dashboard-card__body">
        <div className="offline-metrics" style={{ padding: '16px' }}>
          {rows.map((row) => (
            <div key={row.label} className="offline-metric-row">
              <span className="offline-metric-row__label">{row.label}</span>
              <div className="offline-metric-row__bar">
                <div className="offline-metric-row__fill" style={{ width: `${Math.round(row.ratio * 100)}%` }} />
              </div>
              <span className="offline-metric-row__value">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default OfflineMetricsPanel
