import { useState } from 'react'
import { formatPercent, formatStudents } from '../lib/analytics'
import { useChartAnimation } from '../hooks/useChartAnimation'

type ShareItem = {
  id: string
  label: string
  total: number
  segments: Array<{ label: string; value: number; share: number; color: string }>
}

type StackedShareBarChartProps = {
  title: string
  subtitle: string
  items: ShareItem[]
  activeItemId?: string | null
  onSelectItem?: (id: string) => void
}

function StackedShareBarChart({ title, subtitle, items, activeItemId = null, onSelectItem }: StackedShareBarChartProps) {
  const { ref, isVisible: mounted } = useChartAnimation()
  const [detailItemId, setDetailItemId] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <section className="stacked-share-chart" ref={ref as React.RefObject<HTMLElement>}>
        <div className="panel-heading"><div><h3>{title}</h3></div></div>
        <div className="chart-empty-state">尚無資料</div>
      </section>
    )
  }

  return (
    <section className="stacked-share-chart" ref={ref as React.RefObject<HTMLElement>}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">區域分析</p>
          <h3>{title}</h3>
        </div>
        <p className="panel-heading__meta">{subtitle}</p>
      </div>

      <div className="stacked-share-chart__rows">
        {items.map((item) => {
          const isActive = item.id === activeItemId
          const isDetailed = detailItemId === item.id || isActive
          return (
            <button
              key={item.id}
              type="button"
              className={isActive ? 'stacked-share-chart__row stacked-share-chart__row--active' : 'stacked-share-chart__row'}
              onClick={() => onSelectItem?.(item.id)}
              onMouseEnter={() => setDetailItemId(item.id)}
              onMouseLeave={() => setDetailItemId(null)}
              onFocus={() => setDetailItemId(item.id)}
              onBlur={() => setDetailItemId(null)}
              aria-label={`${item.label}，總數 ${formatStudents(item.total)} 人`}
            >
              <div className="stacked-share-chart__label-group">
                <span className="stacked-share-chart__label">{item.label}</span>
                <span className="stacked-share-chart__meta">{formatStudents(item.total)} 人</span>
              </div>
              <div className="stacked-share-chart__track">
                {item.segments.map((segment) => (
                  <div
                    key={`${item.id}-${segment.label}`}
                    className={`stacked-share-chart__segment${isActive || activeItemId === null ? '' : ' stacked-share-chart__segment--muted'}`}
                    style={{
                      width: mounted ? `${Math.max(segment.share * 100, segment.value > 0 ? 4 : 0)}%` : '0%',
                      background: segment.color,
                    }}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <div className={`stacked-share-chart__values${isActive || activeItemId === null ? '' : ' stacked-share-chart__values--muted'}`}>
                {item.segments.map((segment) => (
                  <span key={`${item.id}-${segment.label}-value`}>{segment.label} {formatPercent(segment.share)}</span>
                ))}
              </div>
              {isDetailed ? (
                <div className="stacked-share-chart__tooltip chart-tooltip chart-tooltip--visible" role="note" aria-live="polite">
                  <div className="chart-tooltip__title">{item.label}</div>
                  {item.segments.map((segment) => (
                    <div key={`${item.id}-${segment.label}-tooltip`} className="chart-tooltip__row">
                      <span className="chart-tooltip__swatch" style={{ background: segment.color }} />
                      <span>{segment.label}</span>
                      <span className="chart-tooltip__value">{formatPercent(segment.share)} / {formatStudents(segment.value)} 人</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default StackedShareBarChart
