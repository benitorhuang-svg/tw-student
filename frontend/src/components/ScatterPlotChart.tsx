import { formatStudents } from '../lib/analytics'

type ScatterPoint = {
  id: string
  label: string
  x: number
  y: number
  size?: number
  detail?: string
}

type ScatterPlotChartProps = {
  title: string
  subtitle: string
  xLabel: string
  yLabel: string
  points: ScatterPoint[]
  activePointId?: string | null
  formatX?: (value: number) => string
  formatY?: (value: number) => string
  onHoverPoint?: (id: string | null) => void
  onSelectPoint?: (id: string) => void
}

function ScatterPlotChart({
  title,
  subtitle,
  xLabel,
  yLabel,
  points,
  activePointId = null,
  formatX = (value) => `${formatStudents(Math.round(value))} 人`,
  formatY = (value) => value.toFixed(1),
  onHoverPoint,
  onSelectPoint,
}: ScatterPlotChartProps) {
  const width = 620
  const height = 260
  const padding = { top: 26, right: 20, bottom: 42, left: 54 }
  const valuesX = points.map((point) => point.x)
  const valuesY = points.map((point) => point.y)
  const minX = Math.min(...valuesX, 0)
  const maxX = Math.max(...valuesX, 1)
  const minY = Math.min(...valuesY, 0)
  const maxY = Math.max(...valuesY, 1)
  const rangeX = Math.max(maxX - minX, 1)
  const rangeY = Math.max(maxY - minY, 1)
  const maxSize = Math.max(...points.map((point) => point.size ?? 12), 12)
  const zeroY = height - padding.bottom - ((0 - minY) / rangeY) * (height - padding.top - padding.bottom)

  const toX = (value: number) => padding.left + ((value - minX) / rangeX) * (width - padding.left - padding.right)
  const toY = (value: number) => height - padding.bottom - ((value - minY) / rangeY) * (height - padding.top - padding.bottom)
  const toRadius = (value: number | undefined) => 5 + ((value ?? 12) / maxSize) * 8

  return (
    <section className="scatter-chart">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">分布關係</p>
          <h3>{title}</h3>
        </div>
        <p className="panel-heading__meta">{subtitle}</p>
      </div>

      <svg className="scatter-chart__svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + ratio * (height - padding.top - padding.bottom)
          const value = maxY - ratio * rangeY
          return (
            <g key={`y-${ratio}`}>
              <line className="scatter-chart__grid" x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
              <text className="scatter-chart__axis" x={padding.left - 8} y={y + 4} textAnchor="end">{formatY(value)}</text>
            </g>
          )
        })}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const x = padding.left + ratio * (width - padding.left - padding.right)
          const value = minX + ratio * rangeX
          return (
            <g key={`x-${ratio}`}>
              <line className="scatter-chart__grid scatter-chart__grid--vertical" x1={x} x2={x} y1={padding.top} y2={height - padding.bottom} />
              <text className="scatter-chart__axis" x={x} y={height - 12} textAnchor="middle">{formatX(value)}</text>
            </g>
          )
        })}

        {minY < 0 && maxY > 0 ? <line className="scatter-chart__zero" x1={padding.left} x2={width - padding.right} y1={zeroY} y2={zeroY} /> : null}

        {points.map((point) => {
          const radius = toRadius(point.size)
          const isActive = point.id === activePointId
          return (
            <g key={point.id}>
              <circle
                className={isActive ? 'scatter-chart__point scatter-chart__point--active' : 'scatter-chart__point'}
                cx={toX(point.x)}
                cy={toY(point.y)}
                r={radius}
                onMouseEnter={() => onHoverPoint?.(point.id)}
                onMouseLeave={() => onHoverPoint?.(null)}
                onClick={() => onSelectPoint?.(point.id)}
              />
              {isActive ? (
                <text className="scatter-chart__label" x={toX(point.x)} y={toY(point.y) - radius - 6} textAnchor="middle">
                  {point.label}
                </text>
              ) : null}
            </g>
          )
        })}

        <text className="scatter-chart__axis-title" x={width / 2} y={height - 2} textAnchor="middle">{xLabel}</text>
        <text className="scatter-chart__axis-title" transform={`translate(14 ${height / 2}) rotate(-90)`} textAnchor="middle">{yLabel}</text>
      </svg>

      <div className="scatter-chart__legend">
        <span>圓點大小代表樣本規模，點選可同步聚焦。</span>
      </div>
    </section>
  )
}

export default ScatterPlotChart