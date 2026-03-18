import { formatAcademicYear, formatStudents } from '../../lib/analytics'
import type { InvestigationItem, InvestigationFilter, DataNote } from '../../hooks/types'

type AnomalyPanelProps = {
  filteredAnomalies: InvestigationItem[]
  activeInvestigation: InvestigationItem | null
  selectedInvestigationId: string | null
  investigationFilter: InvestigationFilter
  scopeNotes: DataNote[]
  scopeHeadline: string
  anomaliesCounts: Record<InvestigationFilter, number>
  onSelectInvestigation: (id: string) => void
  onSetFilter: (filter: InvestigationFilter) => void
  onDownloadInvestigation: (item: InvestigationItem) => void
  onDownloadAll: () => void
  flat?: boolean
}

function AnomalyPanel({
  filteredAnomalies,
  activeInvestigation,
  selectedInvestigationId,
  investigationFilter,
  scopeNotes,
  anomaliesCounts = { '全部': 0, '缺年度': 0, '待確認': 0, '停辦/整併': 0, '正式註記': 0 },
  onSelectInvestigation,
  onSetFilter,
  onDownloadInvestigation,
  onDownloadAll,
  flat = false
}: AnomalyPanelProps) {
  return (
    <section className={`anomaly-panel ${flat ? "dashboard-card--flat" : "dashboard-card"}`}>
      <div className="dashboard-card__head">
        {!flat && (
          <div className="panel-heading__stack">
            <h3 className="dashboard-card__title">異常資料調查面板</h3>
            <p className="dashboard-card__subtitle">僅統計需處理的缺年度、待確認與停辦/整併異常，正式註記另列於下方</p>
          </div>
        )}
        <div className={`dashboard-card__actions ${flat ? 'dashboard-card__actions--flat' : ''}`}>
          <div className="anomaly-filter-controls">
            {(['全部', '缺年度', '待確認', '停辦/整併', '正式註記'] as InvestigationFilter[]).map((val) => {
              const count = anomaliesCounts[val] || 0
              return (
                <button
                  key={val}
                  type="button"
                  className={`filter-tab ${investigationFilter === val ? 'active' : ''}`}
                  onClick={() => onSetFilter(val)}
                >
                  {val} {count > 0 && <span className="filter-count-badge">{count}</span>}
                </button>
              )
            })}
          </div>
          <button type="button" className="ghost-button" onClick={onDownloadAll}>
            匯出 CSV
          </button>
        </div>
      </div>

      <div className="dashboard-card__body scroll-container anomaly-panel__body-container">
        <div className="anomaly-list-grid">
          {filteredAnomalies.length === 0 ? (
            <div className="empty-state">目前工作範圍沒有額外異常訊號。</div>
          ) : (
            filteredAnomalies.map((item) => (
              <button
                key={item.id}
                type="button"
                className={selectedInvestigationId === item.id || (!selectedInvestigationId && activeInvestigation?.id === item.id) ? `data-note data-note--${item.severity} data-note--selected` : `data-note data-note--${item.severity}`}
                onClick={() => onSelectInvestigation(item.id)}
              >
              <div className="anomaly-card__header">
                <strong>{item.title}</strong>
                <span>{item.scope}</span>
              </div>
              <span>{item.detail}</span>
              <small>{item.meta}</small>
            </button>
          ))
        )}
        </div>

      {activeInvestigation ? (
        <div className="anomaly-detail">
          <div className="anomaly-detail__header">
            <div>
              <p className="eyebrow">原始年度序列</p>
              <h4>{activeInvestigation.title}</h4>
              <p>{activeInvestigation.detail}</p>
            </div>
            <button type="button" className="ghost-button" onClick={() => onDownloadInvestigation(activeInvestigation)}>
              下載原始序列 CSV
            </button>
          </div>

          <div className="anomaly-series-visual">
            <div className="status-timeline">
              {activeInvestigation.seriesRows.map((row) => {
                const isFlagged = row.flags && row.flags.length > 0
                return (
                  <div key={`${activeInvestigation.id}-${row.year}`} className="status-timeline__item">
                    <div className="status-timeline__label">{formatAcademicYear(row.year)}</div>
                    <div className={`status-timeline__point ${isFlagged ? 'status-timeline__point--flagged' : ''}`} title={row.flags?.join(', ')}>
                      <div className="point-dot" />
                      <div className="point-value">{formatStudents(row.students)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="anomaly-series-legend">
              <div className="legend-item"><span className="legend-dot" /> 正常數據</div>
              <div className="legend-item"><span className="legend-dot legend-dot--flagged" /> 檢核異常</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="note-stack" data-testid="scope-notes">
        {scopeNotes.length === 0 ? <div className="empty-state">目前工作範圍沒有額外正式註記。</div> : null}
        {scopeNotes.map((note) => (
          <article key={`${note.type}-${note.message}`} className={`data-note data-note--${note.severity}`} data-testid="data-note">
            <strong>{note.type}</strong>
            <span>{note.message}</span>
          </article>
        ))}
      </div>
    </div>
  </section>
)
}

export default AnomalyPanel
