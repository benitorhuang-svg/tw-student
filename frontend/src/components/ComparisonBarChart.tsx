import { useEffect, useState } from 'react'
import { formatStudents } from '../lib/analytics'

const BAR_COLORS = [
  'var(--palette-cyan, #2a6f91)',
  'var(--palette-brass, #b88746)',
  '#7da694',
  '#c97a54',
  '#6b7280'
]

type ComparisonBarChartProps = {
  items: { id: string; label: string; value: number }[]
  activeItemId?: string | null
  onHoverItem?: (id: string | null) => void
  onSelectItem?: (id: string) => void
}

function ComparisonBarChart({ items, activeItemId = null, onHoverItem, onSelectItem }: ComparisonBarChartProps) {
  const max = Math.max(...items.map((i) => i.value), 1)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // 確保組件渲染後再觸發寬度動畫，製造進場效果
    setMounted(true)
  }, [])

  return (
    <div className="comparison-bar-chart">
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
                  width: mounted ? `${targetWidth}%` : '0%',
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

