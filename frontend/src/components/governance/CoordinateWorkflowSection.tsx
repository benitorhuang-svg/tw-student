import React from 'react'
import {
  COORDINATE_WORKFLOW_STATUSES,
  type CoordinateWorkflowStatus,
  type MissingCoordinateEntry,
} from '../../data/educationTypes'
import atomStyles from '../../styles/atoms.module.css'

type CoordinateWorkflowSectionProps = {
  workflowRows: (MissingCoordinateEntry & { workflowStatus: CoordinateWorkflowStatus; workflowUpdatedAt: string | null })[]
  workflowCounts: Record<string, number>
  workflowFilter: string
  setWorkflowFilter: (filter: any) => void
  updateWorkflowStatus: (code: string, status: CoordinateWorkflowStatus) => void
  downloadMissingCoordinates: (rows: any[]) => void
}

export const CoordinateWorkflowSection: React.FC<CoordinateWorkflowSectionProps> = ({
  workflowRows,
  workflowCounts,
  workflowFilter,
  setWorkflowFilter,
  updateWorkflowStatus,
  downloadMissingCoordinates,
}) => {
  const filteredWorkflowRows = workflowFilter === '全部'
    ? workflowRows
    : workflowRows.filter((entry) => entry.workflowStatus === workflowFilter)

  return (
    <section className="school-chart-panel__section">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Coordinate Workflow</p>
          <h3>坐標補件工作簿</h3>
        </div>
        <p className="panel-heading__meta">追蹤統計存在但 GIS 缺點位的校點，確保空間分析之完整性。</p>
      </div>
      <div className="school-profile-sidebar__stats">
        <div className="school-profile-metric">
          <span>待處理</span>
          <strong>{workflowCounts['GIS缺點位']?.toLocaleString('zh-TW') ?? 0}</strong>
          <small>GIS 尚未提供定位</small>
        </div>
        <div className="school-profile-metric">
          <span>人工補點</span>
          <strong>{workflowCounts['人工補點']?.toLocaleString('zh-TW') ?? 0}</strong>
          <small>查找中 / 待回填</small>
        </div>
        <div className="school-profile-metric">
          <span>已回填</span>
          <strong>{workflowCounts['已回填']?.toLocaleString('zh-TW') ?? 0}</strong>
          <small>待下一次刷新驗證</small>
        </div>
      </div>

      {workflowRows.length > 0 && (
        <div className="workflow-controls">
          <div className="chip-row">
            {(['全部', ...COORDINATE_WORKFLOW_STATUSES]).map((status) => (
              <button
                key={status}
                type="button"
                className={`${atomStyles.chip} ${workflowFilter === status ? atomStyles['is-active'] : ''}`}
                onClick={() => setWorkflowFilter(status)}
              >
                {status} <span>{workflowCounts[status]}</span>
              </button>
            ))}
          </div>
          <button type="button" className="action-link" onClick={() => downloadMissingCoordinates(workflowRows)}>
            匯出 CSV
          </button>
        </div>
      )}

      {workflowRows.length > 0 && (
        <div className="governance-missing-list">
          {filteredWorkflowRows.slice(0, 10).map((entry) => (
            <article key={entry.code} className="governance-missing-item">
              <div className="missing-item__info">
                <strong>{entry.name}</strong>
                <span>{entry.county} {entry.township} ({entry.code})</span>
              </div>
              <div className={atomStyles['status-tags']}>
                {COORDINATE_WORKFLOW_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`${atomStyles['status-tag']} ${entry.workflowStatus === status ? atomStyles['is-active'] : ''}`}
                    onClick={() => updateWorkflowStatus(entry.code, status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </article>
          ))}
          {filteredWorkflowRows.length > 10 && (
            <p className="limit-note">... 僅顯示前 10 筆，請匯出 CSV 以取得完整清單</p>
          )}
        </div>
      )}
    </section>
  )
}
