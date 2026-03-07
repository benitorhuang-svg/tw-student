import { formatStudents } from '../lib/analytics'
import type { InvestigationItem, InvestigationFilter, DataNote } from '../hooks/types'

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
    <section className="panel anomaly-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">資料治理</p>
          <h3>異常資料調查面板</h3>
        </div>
        <div className="anomaly-panel__heading-actions">
          <p className="panel-heading__meta">彙整停辦、缺年度、待確認與正式註記，並提供原始年度序列對照、單筆下載與整批匯出。</p>
          <label className="filter-select">
            <span>匯出篩選</span>
            <select value={investigationFilter} onChange={(event) => onSetFilter(event.target.value as InvestigationFilter)}>
              <option value="全部">全部</option>
              <option value="缺年度">缺年度</option>
              <option value="待確認">待確認</option>
              <option value="停辦/整併">停辦/整併</option>
              <option value="正式註記">正式註記</option>
            </select>
          </label>
          <button type="button" className="ghost-button" onClick={onDownloadAll}>
            整批匯出目前異常
          </button>
        </div>
      </div>

      <div className="anomaly-grid">
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

          <div className="anomaly-series-table-wrap">
            <table className="anomaly-series-table">
              <thead>
                <tr>
                  <th>年度</th>
                  <th>學生數</th>
                  <th>學校數</th>
                  <th>旗標</th>
                </tr>
              </thead>
              <tbody>
                {activeInvestigation.seriesRows.map((row) => (
                  <tr key={`${activeInvestigation.id}-${row.year}`}>
                    <td>{row.year}</td>
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
    </section>
  )
}

export default AnomalyPanel
