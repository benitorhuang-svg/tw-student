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
          return (
            <button
              key={item.id}
              type="button"
              className={isActive ? 'stacked-share-chart__row stacked-share-chart__row--active' : 'stacked-share-chart__row'}
              onClick={() => onSelectItem?.(item.id)}
            >
              <div className="stacked-share-chart__label-group">
                <span className="stacked-share-chart__label">{item.label}</span>
                <span className="stacked-share-chart__meta">{formatStudents(item.total)} 人</span>
              </div>
              <div className="stacked-share-chart__track">
                {item.segments.map((segment) => (
                  <div
                    key={`${item.id}-${segment.label}`}
                    className="stacked-share-chart__segment"
                    style={{
                      width: mounted ? `${Math.max(segment.share * 100, segment.value > 0 ? 4 : 0)}%` : '0%',
                      background: segment.color,
                      transition: 'width 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)',
                      opacity: isActive || activeItemId === null ? 1 : 0.4
                    }}
                    title={`${segment.label} ${formatPercent(segment.share)} / ${formatStudents(segment.value)} 人`}
                  />
                ))}
              </div>
              <div className="stacked-share-chart__values" style={{ opacity: isActive || activeItemId === null ? 1 : 0.4 }}>
                {item.segments.map((segment) => (
                  <span key={`${item.id}-${segment.label}-value`}>{segment.label} {formatPercent(segment.share)}</span>
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default StackedShareBarChart
