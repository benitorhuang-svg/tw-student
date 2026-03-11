import { formatDelta, formatPercent, formatStudents, type RankingSummary, type TrendPoint } from '../lib/analytics'
import { useChartAnimation } from '../hooks/useChartAnimation'

function Sparkline({ points, width = 60, height = 20 }: { points: TrendPoint[]; width?: number; height?: number }) {
  if (points.length < 2) return null
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const coords = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 2) - 1
    return `${x},${y}`
  })
  const isDown = values[values.length - 1] < values[0]
  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke={isDown ? '#f97316' : '#10b981'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type InsightPanelProps = {
  title: string
  subtitle: string
  showHeader?: boolean
  rows: RankingSummary[]
  activeRowId: string | null
  onSelectRow: (rowId: string) => void
  onHoverRow?: (rowId: string | null) => void
  emptyMessage: string
}

function InsightPanel({
  title, subtitle, showHeader = true, rows, activeRowId,
  onSelectRow, onHoverRow, emptyMessage,
}: InsightPanelProps) {
  const maxStudents = Math.max(...rows.map((row) => row.students), 1)
  const { ref, isVisible: mounted } = useChartAnimation()

  return (
    <section className="panel insight-panel" ref={ref as React.RefObject<HTMLElement>}>
      {showHeader && (
        <div className="panel-heading">
          <div>
            <p className="eyebrow">層級排行</p>
            <h3>{title}</h3>
          </div>
          <p className="panel-heading__meta">{subtitle}</p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="empty-state">{emptyMessage}</div>
      ) : (
        <div className="insight-panel__rows">
          {rows.map((row, index) => {
            const isActive = row.id === activeRowId
            return (
              <button
                key={row.id}
                className={isActive ? 'insight-row insight-row--active' : 'insight-row'}
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
                  <Sparkline points={row.trend} />
                </div>
                <div className="insight-row__bar-track">
                  <div
                    className="insight-row__bar-fill"
                    style={{
                      width: mounted ? `${Math.max((row.students / maxStudents) * 100, 2)}%` : '0%',
                      background: isActive ? 'var(--palette-cyan)' : 'var(--palette-cyan)',
                      opacity: isActive ? 1 : 0.6,
                      transition: 'width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), background-color 0.3s ease, opacity 0.3s ease'
                    }}
                  />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default InsightPanel
