import React from 'react'
import { type DataRefreshSummary } from '../../data/educationTypes'

type DeploymentInsightSectionProps = {
  refreshSummary: DataRefreshSummary | null
}

export const DeploymentInsightSection: React.FC<DeploymentInsightSectionProps> = ({ refreshSummary }) => {
  return (
    <section className="school-chart-panel__section" data-testid="governance-refresh-summary">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Deployment Insight</p>
          <h3>版本比較與差異結果</h3>
        </div>
        <p className="panel-heading__meta">記錄最近一次無感刷新所觸及的實體資產變更。</p>
      </div>
      <div className="school-profile-sidebar__stats">
        <div className="school-profile-metric">
          <span>刷新結果</span>
          <strong>{refreshSummary?.overallStatus ?? 'idle'}</strong>
          <small>{refreshSummary?.message ?? '尚未執行差異刷新'}</small>
        </div>
        <div className="school-profile-metric">
          <span>已更新資產</span>
          <strong>{refreshSummary?.updatedAssets.length ?? 0}</strong>
          <small>個切片已完成同步</small>
        </div>
        <div className="school-profile-metric">
          <span>失敗資產</span>
          <strong>{refreshSummary?.failedAssets.length ?? 0}</strong>
          <small>保留 Last-known-good</small>
        </div>
        <div className="school-profile-metric">
          <span>略過</span>
          <strong>{refreshSummary?.skippedAssets.length ?? 0}</strong>
          <small>版本相同或非作用切片</small>
        </div>
      </div>
    </section>
  )
}
