import { formatAcademicYear, formatStudents } from '../../lib/analytics'
import type { InvestigationItem, InvestigationFilter, DataNote } from '../../hooks/types'

type AnomalyPanelProps = {
  filteredAnomalies: InvestigationItem[]
  activeInvestigation: InvestigationItem | null
  selectedInvestigationId: string | null
  investigationFilter: InvestigationFilter
  scopeNotes: DataNote[]
  scopeHeadline: string
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
  onSelectInvestigation,
  onSetFilter,
  onDownloadInvestigation,
  onDownloadAll,
  flat = false
}: AnomalyPanelProps) {
  return (
    <section className={`anomaly-panel ${flat ? "dashboard-card--flat" : "dashboard-card"}`}>
      {!flat && (
        <div className="dashboard-card__head">
          <div className="panel-heading__stack">
            <h3 className="dashboard-card__title">異常資料調查面板</h3>
            <p className="dashboard-card__subtitle">彙整停辦、缺年度、待確認與正式註記</p>
          </div>
          <div className="dashboard-card__actions">
            <label className="filter-select">
              <span>篩選</span>
              <select value={investigationFilter} onChange={(event) => onSetFilter(event.target.value as InvestigationFilter)}>
                <option value="全部">全部</option>
                <option value="缺年度">缺年度</option>
                <option value="待確認">待確認</option>
                <option value="停辦/整併">停辦/整併</option>
                <option value="正式註記">正式註記</option>
              </select>
            </label>
            <button type="button" className="ghost-button" onClick={onDownloadAll}>
              匯出 CSV
            </button>
          </div>
        </div>
      )}

      <div className="dashboard-card__body" style={{ padding: '20px' }}>
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
