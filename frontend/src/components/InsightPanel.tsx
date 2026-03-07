import { formatDelta, formatPercent, formatStudents, type RankingSummary } from '../lib/analytics'

type InsightPanelProps = {
  title: string
  subtitle: string
  rows: RankingSummary[]
  activeRowId: string | null
  onSelectRow: (rowId: string) => void
  onHoverRow?: (rowId: string | null) => void
  emptyMessage: string
}

function InsightPanel({
  title,
  subtitle,
  rows,
  activeRowId,
  onSelectRow,
  onHoverRow,
  emptyMessage,
}: InsightPanelProps) {
  const maxStudents = Math.max(...rows.map((row) => row.students), 1)

  return (
    <section className="panel insight-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">層級排行</p>
          <h3>{title}</h3>
        </div>
        <p className="panel-heading__meta">{subtitle}</p>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">{emptyMessage}</div>
      ) : (
        <div className="insight-panel__rows">
          {rows.map((row, index) => (
            <button
              key={row.id}
              className={row.id === activeRowId ? 'insight-row insight-row--active' : 'insight-row'}
              type="button"
              onClick={() => onSelectRow(row.id)}
              onMouseEnter={() => onHoverRow?.(row.id)}
              onMouseLeave={() => onHoverRow?.(null)}
            >
              <div className="insight-row__meta">
                <span className="insight-row__index">#{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{row.label}</strong>
                  <span>{row.subLabel}</span>
                </div>
              </div>
              <div className="insight-row__metrics">
                <span>{formatStudents(row.students)} 人</span>
                <span>{row.schools} 校</span>
                <span>
                  {formatDelta(row.delta)} / {formatPercent(row.deltaRatio)}
                </span>
              </div>
              <div className="insight-row__bar-track">
                <div className="insight-row__bar-fill" style={{ width: `${Math.max((row.students / maxStudents) * 100, 10)}%` }} />
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

export default InsightPanel