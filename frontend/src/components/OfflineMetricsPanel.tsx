import { formatFileSize } from '../lib/analytics'

type LoadObservation = {
  cacheHits: number
  memoryHits: number
  indexedDbHits: number
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
  const totalRequests = loadObservation.cacheHits + loadObservation.memoryHits + loadObservation.indexedDbHits + loadObservation.networkFetches
  const cacheRatio = totalRequests > 0 ? (loadObservation.cacheHits + loadObservation.memoryHits + loadObservation.indexedDbHits) / totalRequests : 0
  const coverageRatio = totalCounties > 0 ? offlineReadySlices / totalCounties : 0

  const rows = [
    { label: '快取命中', value: `${Math.round(cacheRatio * 100)}%`, ratio: cacheRatio },
    { label: '縣市覆蓋', value: `${offlineReadySlices}/${totalCounties}`, ratio: coverageRatio },
    { label: '傳輸量', value: formatFileSize(loadObservation.totalTransferredBytes), ratio: Math.min(loadObservation.totalTransferredBytes / (5 * 1024 * 1024), 1) },
    { label: '記憶體', value: `${loadObservation.memoryHits} 次`, ratio: totalRequests > 0 ? loadObservation.memoryHits / totalRequests : 0 },
    { label: 'IndexedDB', value: `${loadObservation.indexedDbHits} 次`, ratio: totalRequests > 0 ? loadObservation.indexedDbHits / totalRequests : 0 },
    { label: '網路請求', value: `${loadObservation.networkFetches} 次`, ratio: totalRequests > 0 ? loadObservation.networkFetches / totalRequests : 0 },
  ]

  return (
    <section className="sidebar-block">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{isOffline ? '離線模式' : '快取狀態'}</p>
          <h3>離線指標</h3>
        </div>
      </div>
      <div className="offline-metrics">
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
    </section>
  )
}

export default OfflineMetricsPanel
