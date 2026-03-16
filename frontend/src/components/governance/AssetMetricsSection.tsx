import React from 'react'
import { formatBytes } from './governanceUtils'

type AssetMetricsSectionProps = {
  assetMetrics?: {
    sqliteBytes?: number
    summaryBytes?: number
    countyBoundaryBytes: number
    countyDetailBytes: number
    countyBucketBytes?: number
    townshipBoundaryBytes: number
  }
  sources: {
    points: string
    statistics: string
    townshipBoundaries: string
    countyBoundaries: string
  }
}

export const AssetMetricsSection: React.FC<AssetMetricsSectionProps> = ({ assetMetrics, sources }) => {
  return (
    <section className="school-chart-panel__section">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Asset Metrics</p>
          <h3>部署尺寸與官方來源</h3>
        </div>
      </div>
      <div className="asset-grid">
        <div className="asset-item">
          <span>教育摘要</span>
          <strong>{formatBytes(assetMetrics?.summaryBytes)}</strong>
        </div>
        <div className="asset-item">
          <span>縣市細節</span>
          <strong>{formatBytes(assetMetrics?.countyDetailBytes)}</strong>
        </div>
        <div className="asset-item">
          <span>校點群聚</span>
          <strong>{formatBytes(assetMetrics?.countyBucketBytes)}</strong>
        </div>
        <div className="asset-item">
          <span>行政邊界</span>
          <strong>{formatBytes(assetMetrics?.townshipBoundaryBytes)}</strong>
        </div>
      </div>
      <div className="source-links">
        <a href={sources.statistics} target="_blank" rel="noreferrer">統計處</a>
        <a href={sources.points} target="_blank" rel="noreferrer">教育 GIS</a>
        <a href={sources.countyBoundaries} target="_blank" rel="noreferrer">國土測繪</a>
      </div>
    </section>
  )
}
