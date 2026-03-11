import { useState } from 'react'
import { useChartAnimation } from '../hooks/useChartAnimation'
import { formatStudents } from '../lib/analytics'

type ButterflyItem = {
  id: string
  label: string
  leftValue: number
  rightValue: number
  leftLabel: string
  rightLabel: string
}

type ButterflyChartProps = {
  title: string
  subtitle: string
  items: ButterflyItem[]
  activeItemId?: string | null
  onSelectItem?: (id: string) => void
}

function ButterflyChart({
  title,
  subtitle,
  items,
  activeItemId = null,
  onSelectItem,
}: ButterflyChartProps) {
  const { ref, isVisible } = useChartAnimation()
  const [detailItemId, setDetailItemId] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <section ref={ref as React.RefObject<HTMLElement>} className="butterfly-chart">
        <div className="panel-heading butterfly-chart__heading"><div><h3>{title}</h3></div></div>
        <div className="chart-empty-state">尚無資料</div>
      </section>
    )
  }

  const maxSide = Math.max(...items.flatMap((item) => [item.leftValue, item.rightValue]), 1)

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className={isVisible ? 'butterfly-chart chart-enter chart-enter--visible' : 'butterfly-chart chart-enter'}
    >
      <div className="panel-heading butterfly-chart__heading">
        <div>
          <p className="eyebrow">公私立平衡蝴蝶圖</p>
          <h3>{title}</h3>
        </div>
        <p className="panel-heading__meta">{subtitle}</p>
      </div>

      <div className="butterfly-chart__header" aria-hidden="true">
        <span className="butterfly-chart__side butterfly-chart__side--left">公立</span>
        <span className="butterfly-chart__center-label">地區</span>
        <span className="butterfly-chart__side butterfly-chart__side--right">私立</span>
      </div>

      <div className="butterfly-chart__rows" role="list" aria-label={title}>
        {items.map((item) => {
          const isActive = item.id === activeItemId
          const isDetailed = detailItemId === item.id || isActive
          const leftWidth = `${(item.leftValue / maxSide) * 100}%`
          const rightWidth = `${(item.rightValue / maxSide) * 100}%`

          return (
            <button
              key={item.id}
              type="button"
              className={isActive ? 'butterfly-chart__row butterfly-chart__row--active' : 'butterfly-chart__row'}
              onClick={() => onSelectItem?.(item.id)}
              onMouseEnter={() => setDetailItemId(item.id)}
              onMouseLeave={() => setDetailItemId(null)}
              onFocus={() => setDetailItemId(item.id)}
              onBlur={() => setDetailItemId(null)}
              aria-label={`${item.label}，${item.leftLabel} ${formatStudents(item.leftValue)} 人，${item.rightLabel} ${formatStudents(item.rightValue)} 人`}
            >
              <div className="butterfly-chart__track butterfly-chart__track--left">
                <div className="butterfly-chart__fill butterfly-chart__fill--left" style={{ width: isVisible ? leftWidth : '0%' }} />
                <span className="butterfly-chart__value butterfly-chart__value--left">{formatStudents(item.leftValue)}</span>
              </div>

              <div className="butterfly-chart__label-group">
                <strong>{item.label}</strong>
                <small>
                  {item.leftValue + item.rightValue === 0
                    ? '樣本不足'
                    : `${Math.round((item.leftValue / Math.max(item.leftValue + item.rightValue, 1)) * 100)}% / ${Math.round((item.rightValue / Math.max(item.leftValue + item.rightValue, 1)) * 100)}%`}
                </small>
              </div>

              <div className="butterfly-chart__track butterfly-chart__track--right">
                <div className="butterfly-chart__fill butterfly-chart__fill--right" style={{ width: isVisible ? rightWidth : '0%' }} />
                <span className="butterfly-chart__value butterfly-chart__value--right">{formatStudents(item.rightValue)}</span>
              </div>
              {isDetailed ? (
                <div className="chart-tooltip chart-tooltip--visible butterfly-chart__tooltip" role="note" aria-live="polite">
                  <div className="chart-tooltip__title">{item.label}</div>
                  <div className="chart-tooltip__row">
                    <span>{item.leftLabel}</span>
                    <span className="chart-tooltip__value">{formatStudents(item.leftValue)} 人</span>
                  </div>
                  <div className="chart-tooltip__row">
                    <span>{item.rightLabel}</span>
                    <span className="chart-tooltip__value">{formatStudents(item.rightValue)} 人</span>
                  </div>
                </div>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default ButterflyChart