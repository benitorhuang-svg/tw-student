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
}: AnomalyPanelProps) {
  return (
    <section className="dashboard-card anomaly-panel">
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

          <div className="anomaly-series-table-wrap">
            <table className="anomaly-series-table">
              <thead>
                <tr>
                  <th>學年度（西元）</th>
                  <th>學生數</th>
                  <th>學校數</th>
                  <th>旗標</th>
                </tr>
              </thead>
              <tbody>
                {activeInvestigation.seriesRows.map((row) => (
                  <tr key={`${activeInvestigation.id}-${row.year}`}>
                    <td>{formatAcademicYear(row.year)}</td>
                    <td>{formatStudents(row.students)}</td>
                    <td>{row.schools != null ? row.schools.toLocaleString('zh-TW') : '—'}</td>
                    <td>{row.flags?.length ? row.flags.join(' / ') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
