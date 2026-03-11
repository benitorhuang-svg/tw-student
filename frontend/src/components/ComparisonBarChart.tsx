import { useChartAnimation } from '../hooks/useChartAnimation'
import { formatStudents } from '../lib/analytics'

const BAR_COLORS = [
  'var(--chart-series-0, #2a6f91)',
  'var(--chart-series-1, #2d8f6f)',
  'var(--chart-series-2, #b88746)',
  'var(--chart-series-3, #c96a4b)',
  'var(--chart-series-4, #7c5cbf)',
  'var(--chart-series-5, #38bdf8)',
  'var(--chart-series-6, #34d399)',
  'var(--chart-series-7, #fbbf24)',
  'var(--chart-series-8, #f87171)',
  'var(--chart-series-9, #a78bfa)',
  'var(--chart-series-10, #22d3ee)',
  'var(--chart-series-11, #fb923c)',
]

type ComparisonBarChartProps = {
  items: { id: string; label: string; value: number }[]
  activeItemId?: string | null
  onHoverItem?: (id: string | null) => void
  onSelectItem?: (id: string) => void
}

function ComparisonBarChart({ items, activeItemId = null, onHoverItem, onSelectItem }: ComparisonBarChartProps) {
  const max = Math.max(...items.map((i) => i.value), 1)
  const { ref, isVisible } = useChartAnimation()

  if (items.length === 0) {
    return (
      <div ref={ref as React.RefObject<HTMLDivElement>} className="comparison-bar-chart">
        <div className="chart-empty-state">尚無資料</div>
      </div>
    )
  }

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className={isVisible ? 'comparison-bar-chart chart-enter chart-enter--visible' : 'comparison-bar-chart chart-enter'}>
      {items.map((item, idx) => {
        const targetWidth = Math.max((item.value / max) * 100, 2)
        const isActive = item.id === activeItemId
        const color = isActive ? 'var(--palette-brass, #b88746)' : BAR_COLORS[idx % BAR_COLORS.length]

        return (
          <button
            key={item.id}
            type="button"
            className={isActive ? 'comparison-bar-chart__row comparison-bar-chart__row--active' : 'comparison-bar-chart__row'}
            onMouseEnter={() => onHoverItem?.(item.id)}
            onMouseLeave={() => onHoverItem?.(null)}
            onClick={() => onSelectItem?.(item.id)}
            style={{
              borderColor: isActive ? color : undefined,
              background: isActive ? `linear-gradient(135deg, rgba(255,255,255,0.9), rgba(243,239,232,1))` : undefined,
            }}
          >
            <span className="comparison-bar-chart__label" title={item.label} style={{ color: isActive ? color : undefined }}>{item.label}</span>
            <div className="comparison-bar-chart__track">
              <div
                className="comparison-bar-chart__fill"
                style={{
                  width: isVisible ? `${targetWidth}%` : '0%',
                  background: color,
                  transition: 'width 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), background-color 0.3s ease',
                  opacity: isActive || activeItemId === null ? 1 : 0.4
                }}
              />
            </div>
            <span className="comparison-bar-chart__value" style={{ color: isActive ? color : undefined }}>{formatStudents(item.value)}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ComparisonBarChart

