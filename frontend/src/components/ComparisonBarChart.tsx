import { formatStudents } from '../lib/analytics'

const BAR_COLORS = [
  'linear-gradient(90deg, #2563eb, #0891b2)',
  'linear-gradient(90deg, #0f766e, #22c55e)',
  'linear-gradient(90deg, #d97706, #fbbf24)',
  'linear-gradient(90deg, #9333ea, #c084fc)',
]

type ComparisonBarChartProps = {
  items: { id: string; label: string; value: number }[]
  activeItemId?: string | null
  onHoverItem?: (id: string | null) => void
  onSelectItem?: (id: string) => void
}

function ComparisonBarChart({ items, activeItemId = null, onHoverItem, onSelectItem }: ComparisonBarChartProps) {
  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <div className="comparison-bar-chart">
      {items.map((item, idx) => (
        <button
          key={item.id}
          type="button"
          className={item.id === activeItemId ? 'comparison-bar-chart__row comparison-bar-chart__row--active' : 'comparison-bar-chart__row'}
          onMouseEnter={() => onHoverItem?.(item.id)}
          onMouseLeave={() => onHoverItem?.(null)}
          onClick={() => onSelectItem?.(item.id)}
        >
          <span className="comparison-bar-chart__label" title={item.label}>{item.label}</span>
          <div className="comparison-bar-chart__track">
            <div
              className="comparison-bar-chart__fill"
              style={{
                width: `${Math.max((item.value / max) * 100, 4)}%`,
                background: BAR_COLORS[idx % BAR_COLORS.length],
              }}
            />
          </div>
          <span className="comparison-bar-chart__value">{formatStudents(item.value)}</span>
        </button>
      ))}
    </div>
  )
}

export default ComparisonBarChart
