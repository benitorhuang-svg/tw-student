import { type TrendPoint, formatStudents } from '../lib/analytics'

type TrendChartProps = {
  chartId: string
  title: string
  subtitle: string
  points: TrendPoint[]
  activeYear: number
}

function buildLinePath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return ''
  }

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

function TrendChart({ chartId, title, subtitle, points, activeYear }: TrendChartProps) {
  const width = 620
  const height = 240
  const paddingX = 36
  const paddingY = 28
  const values = points.map((point) => point.value)
  const maxValue = Math.max(...values, 1)
  const minValue = Math.min(...values, 0)
  const valueRange = Math.max(maxValue - minValue, 1)

  const normalizedPoints = points.map((point, index) => {
    const x = paddingX + (index * (width - paddingX * 2)) / Math.max(points.length - 1, 1)
    const y = height - paddingY - ((point.value - minValue) / valueRange) * (height - paddingY * 2)
    return { ...point, x, y }
  })

  const linePath = buildLinePath(normalizedPoints)
  const areaPath = `${linePath} L ${normalizedPoints.at(-1)?.x ?? paddingX} ${height - paddingY} L ${paddingX} ${height - paddingY} Z`

  return (
    <section className="trend-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">趨勢視窗</p>
          <h3>{title}</h3>
        </div>
        <p className="panel-heading__meta">{subtitle}</p>
      </div>
      <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <defs>
          <linearGradient id={`${chartId}-area`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.34)" />
            <stop offset="100%" stopColor="rgba(16, 185, 129, 0.02)" />
          </linearGradient>
        </defs>
        {[0, 0.33, 0.66, 1].map((ratio) => {
          const y = paddingY + ratio * (height - paddingY * 2)
          return <line key={ratio} className="trend-chart__grid" x1={paddingX} x2={width - paddingX} y1={y} y2={y} />
        })}
        <path className="trend-chart__area" d={areaPath} fill={`url(#${chartId}-area)`} />
        <path className="trend-chart__line" d={linePath} />
        {normalizedPoints.map((point) => (
          <g key={point.year}>
            <circle
              className={point.year === activeYear ? 'trend-chart__point trend-chart__point--active' : 'trend-chart__point'}
              cx={point.x}
              cy={point.y}
              r={point.year === activeYear ? 6 : 4}
            />
            <text className="trend-chart__label" x={point.x} y={height - 6} textAnchor="middle">
              {point.year}
            </text>
          </g>
        ))}
      </svg>
      <div className="trend-chart__footnote">
        <span>最高值 {formatStudents(maxValue)} 人</span>
        <span>最低值 {formatStudents(minValue)} 人</span>
      </div>
    </section>
  )
}

export default TrendChart