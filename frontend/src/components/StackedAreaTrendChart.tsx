import type { TrendPoint } from '../lib/analytics'
import { formatAcademicYearCompact, formatStudents } from '../lib/analytics'

type Series = {
  label: string
  points: TrendPoint[]
}

type StackedAreaTrendChartProps = {
  title: string
  subtitle: string
  series: Series[]
  activeYear: number
}

const SERIES_COLORS = ['#2a6f91', '#7da694', '#b88746', '#c97a54']

function StackedAreaTrendChart({ title, subtitle, series, activeYear }: StackedAreaTrendChartProps) {
  const width = 620
  const height = 260
  const paddingX = 40
  const paddingY = 28
  const years = Array.from(new Set(series.flatMap((item) => item.points.map((point) => point.year)))).sort((left, right) => left - right)
  const totals = years.map((year) => series.reduce((sum, item) => sum + (item.points.find((point) => point.year === year)?.value ?? 0), 0))
  const maxTotal = Math.max(...totals, 1)

  const toX = (index: number) => paddingX + (index * (width - paddingX * 2)) / Math.max(years.length - 1, 1)
  const toY = (value: number) => height - paddingY - (value / maxTotal) * (height - paddingY * 2)

  const layers = series.map((item, seriesIndex) => {
    const previousSeries = series.slice(0, seriesIndex)
    const topPoints = years.map((year, yearIndex) => {
      const ownValue = item.points.find((point) => point.year === year)?.value ?? 0
      const stackedBase = previousSeries.reduce((sum, current) => sum + (current.points.find((point) => point.year === year)?.value ?? 0), 0)
      const stackedValue = stackedBase + ownValue
      return { x: toX(yearIndex), y: toY(stackedValue), value: ownValue, total: stackedValue, year }
    })
    const bottomPoints = years.map((year, yearIndex) => {
      const stackedBase = previousSeries.reduce((sum, current) => sum + (current.points.find((point) => point.year === year)?.value ?? 0), 0)
      return { x: toX(yearIndex), y: toY(stackedBase), year }
    })
    const path = [
      `M ${topPoints[0]?.x ?? paddingX} ${topPoints[0]?.y ?? height - paddingY}`,
      ...topPoints.slice(1).map((point) => `L ${point.x} ${point.y}`),
      ...bottomPoints.reverse().map((point) => `L ${point.x} ${point.y}`),
      'Z',
    ].join(' ')
    const linePath = topPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')

    return {
      ...item,
      color: SERIES_COLORS[seriesIndex % SERIES_COLORS.length],
      path,
      linePath,
      topPoints,
    }
  })

  return (
    <section className="stacked-area-chart">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">全台總覽</p>
          <h3>{title}</h3>
        </div>
        <p className="panel-heading__meta">{subtitle}</p>
      </div>

      <svg className="stacked-area-chart__svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = paddingY + ratio * (height - paddingY * 2)
          const value = Math.round(maxTotal * (1 - ratio))
          return (
            <g key={ratio}>
              <line className="stacked-area-chart__grid" x1={paddingX} x2={width - paddingX} y1={y} y2={y} />
              <text className="stacked-area-chart__axis" x={paddingX - 8} y={y + 4} textAnchor="end">{formatStudents(value)}</text>
            </g>
          )
        })}

        {layers.map((layer) => (
          <g key={layer.label}>
            <path d={layer.path} fill={layer.color} fillOpacity={0.14} />
            <path d={layer.linePath} stroke={layer.color} strokeWidth={2.4} fill="none" />
          </g>
        ))}

        {years.map((year, index) => (
          <text key={year} className="stacked-area-chart__axis" x={toX(index)} y={height - 8} textAnchor="middle">
            {formatAcademicYearCompact(year)}
          </text>
        ))}

        {layers.map((layer) => {
          const activePoint = layer.topPoints.find((point) => point.year === activeYear)
          if (!activePoint) return null
          return <circle key={`${layer.label}-${activeYear}`} cx={activePoint.x} cy={activePoint.y} r={4.5} fill={layer.color} />
        })}
      </svg>

      <div className="stacked-area-chart__legend">
        {layers.map((layer) => {
          const activePoint = layer.topPoints.find((point) => point.year === activeYear)
          return (
            <div key={layer.label} className="stacked-area-chart__legend-item">
              <span className="stacked-area-chart__swatch" style={{ background: layer.color }} />
              <span>{layer.label}</span>
              <strong>{formatStudents(activePoint?.value ?? 0)} 人</strong>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default StackedAreaTrendChart