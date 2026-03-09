import { formatAcademicYearCompact, type TrendPoint, formatStudents } from '../lib/analytics'

type TrendChartProps = {
  chartId: string
  title: string
  subtitle: string
  points: TrendPoint[]
  activeYear: number
  showHeader?: boolean
  formatValue?: (value: number) => string
}

function buildLinePath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return ''
  }

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

/** Simple linear regression: returns { slope, intercept } */
function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number } | null {
  const n = xs.length
  if (n < 2) return null
  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0)
  const sumX2 = xs.reduce((a, x) => a + x * x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return null
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

function TrendChart({ chartId, title, subtitle, points, activeYear, showHeader = true, formatValue = (value) => `${formatStudents(Math.round(value))} 人` }: TrendChartProps) {
  const PREDICT_YEARS = 2
  const width = 620
  const height = 240
  const paddingX = 36
  const paddingY = 28
  const values = points.map((point) => point.value)

  // Compute regression for prediction values
  const reg = linearRegression(
    points.map((_, i) => i),
    values,
  )
  const predictionValues = reg
    ? Array.from({ length: PREDICT_YEARS }, (_, k) => reg.slope * (points.length + k) + reg.intercept)
    : []

  const allValues = [...values, ...predictionValues]
  const maxValue = Math.max(...allValues, 1)
  const minValue = Math.min(...allValues, 0)
  const valueRange = Math.max(maxValue - minValue, 1)
  const totalPoints = points.length + PREDICT_YEARS

  const toX = (i: number) => paddingX + (i * (width - paddingX * 2)) / Math.max(totalPoints - 1, 1)
  const toY = (v: number) => height - paddingY - ((v - minValue) / valueRange) * (height - paddingY * 2)

  const normalizedPoints = points.map((point, index) => ({
    ...point,
    x: toX(index),
    y: toY(point.value),
  }))

  const predictionPoints = predictionValues.map((v, k) => ({
    x: toX(points.length + k),
    y: toY(v),
    year: (points.at(-1)?.year ?? activeYear) + k + 1,
    value: Math.round(v),
  }))

  const linePath = buildLinePath(normalizedPoints)
  const areaPath = `${linePath} L ${normalizedPoints.at(-1)?.x ?? paddingX} ${height - paddingY} L ${paddingX} ${height - paddingY} Z`

  // Regression line covering actual data range
  const regLinePath =
    reg && normalizedPoints.length >= 2
      ? buildLinePath(
          normalizedPoints.map((_, i) => ({
            x: toX(i),
            y: toY(reg.slope * i + reg.intercept),
          })),
        )
      : ''

  // Prediction dashed path (extends from last actual point)
  const predLinePath =
    normalizedPoints.length > 0 && predictionPoints.length > 0
      ? buildLinePath([
          { x: normalizedPoints.at(-1)!.x, y: normalizedPoints.at(-1)!.y },
          ...predictionPoints,
        ])
      : ''

  return (
    <section className="trend-panel">
      {showHeader ? (
        <div className="panel-heading">
          <div>
            <p className="eyebrow">趨勢視窗</p>
            <h3>{title}</h3>
          </div>
          <p className="panel-heading__meta">{subtitle}</p>
        </div>
      ) : null}
      <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <defs>
          <linearGradient id={`${chartId}-area`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(42, 111, 145, 0.32)" />
            <stop offset="60%" stopColor="rgba(120, 165, 188, 0.12)" />
            <stop offset="100%" stopColor="rgba(42, 111, 145, 0.02)" />
          </linearGradient>
        </defs>
        {[0, 0.33, 0.66, 1].map((ratio) => {
          const y = paddingY + ratio * (height - paddingY * 2)
          return <line key={ratio} className="trend-chart__grid" x1={paddingX} x2={width - paddingX} y1={y} y2={y} />
        })}
        <path className="trend-chart__area" d={areaPath} fill={`url(#${chartId}-area)`} />
        <path className="trend-chart__line" d={linePath} />
        {regLinePath && <path className="trend-chart__regression" d={regLinePath} />}
        {predLinePath && <path className="trend-chart__prediction" d={predLinePath} />}
        {normalizedPoints.map((point) => (
          <g key={point.year}>
            <circle
              className={point.year === activeYear ? 'trend-chart__point trend-chart__point--active' : 'trend-chart__point'}
              cx={point.x}
              cy={point.y}
              r={point.year === activeYear ? 6 : 4}
            />
            <text className="trend-chart__label" x={point.x} y={height - 6} textAnchor="middle">
              {formatAcademicYearCompact(point.year)}
            </text>
          </g>
        ))}
        {predictionPoints.map((point) => (
          <g key={point.year}>
            <circle className="trend-chart__point trend-chart__point--predicted" cx={point.x} cy={point.y} r={4} />
            <text className="trend-chart__label trend-chart__label--predicted" x={point.x} y={height - 6} textAnchor="middle">
              {formatAcademicYearCompact(point.year)}?
            </text>
          </g>
        ))}
      </svg>
      <div className="trend-chart__footnote">
        <span>最高值 {formatValue(Math.max(...values, 1))}</span>
        <span>最低值 {formatValue(Math.min(...values, 0))}</span>
        {reg ? <span>年均變化 {formatValue(Math.round(reg.slope))}</span> : null}
      </div>
    </section>
  )
}

export default TrendChart