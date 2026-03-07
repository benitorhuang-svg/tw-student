import { formatStudents } from '../lib/analytics'

const BAR_COLORS = [
  'linear-gradient(90deg, #2563eb, #0891b2)',
  'linear-gradient(90deg, #0f766e, #22c55e)',
  'linear-gradient(90deg, #d97706, #fbbf24)',
  'linear-gradient(90deg, #9333ea, #c084fc)',
]

type ComparisonBarChartProps = {
  items: { id: string; label: string; value: number }[]
}

function ComparisonBarChart({ items }: ComparisonBarChartProps) {
  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <div className="comparison-bar-chart">
      {items.map((item, idx) => (
        <div key={item.id} className="comparison-bar-chart__row">
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
        </div>
      ))}
    </div>
  )
}

export default ComparisonBarChart
