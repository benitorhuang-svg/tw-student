import { useState, useRef, useEffect } from 'react'
import { formatAcademicYearCompact, type TrendPoint, formatStudents } from '../lib/analytics'
import { useChartAnimation } from '../hooks/useChartAnimation'
import { useResponsiveSvg } from '../hooks/useResponsiveSvg'

type TrendChartProps = {
  chartId: string
  title: string
  subtitle: string
  points: TrendPoint[]
  benchmarkPoints?: TrendPoint[]
  activeYear: number
  showHeader?: boolean
  formatValue?: (value: number) => string
  benchmarkLabel?: string
  predictionLabel?: string
  className?: string
  flat?: boolean
}

function buildLinePath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return ''
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

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

function TrendChart({
  chartId,
  title,
  subtitle,
  points,
  benchmarkPoints,
  activeYear,
  showHeader = true,
  formatValue = (value) => `${formatStudents(Math.round(value))} 人`,
  benchmarkLabel = '基準參考',
  predictionLabel = '線性預測',
  className,
  flat,
}: TrendChartProps) {
  const PREDICT_YEARS = 2
  const { containerRef, width, height } = useResponsiveSvg(620, 240, { minWidth: 320 })
  const paddingX = 36
  const paddingY = 28

  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [dashArray, setDashArray] = useState<string | number>('0 1000')
  const pathRef = useRef<SVGPathElement>(null)
  const { ref: animRef, isVisible } = useChartAnimation()

  const combinedClasses = [
    'dashboard-card',
    'trend-panel',
    flat ? 'dashboard-card--flat' : '',
    isVisible ? 'chart-enter chart-enter--visible' : 'chart-enter',
    className || ''
  ].filter(Boolean).join(' ')

  useEffect(() => {
    if (pathRef.current && isVisible) {
      const length = pathRef.current.getTotalLength()
      setDashArray(length)
    }
  }, [points, isVisible])

  const values = points.map((point) => point.value)
  const benchValues = benchmarkPoints?.map(p => p.value) ?? []

  const reg = linearRegression(points.map((_, i) => i), values)
  const predictionValues = reg
    ? Array.from({ length: PREDICT_YEARS }, (_, k) => reg.slope * (points.length + k) + reg.intercept)
    : []

  const allValues = [...values, ...predictionValues, ...benchValues]
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

  const normalizedBench = benchmarkPoints?.map((p, i) => ({
    x: toX(i),
    y: toY(p.value)
  }))

  const normalizedPrediction = predictionValues.map((value, index) => ({
    year: points.at(-1)?.year ? points[points.length - 1].year + index + 1 : activeYear + index + 1,
    x: toX(points.length + index),
    y: toY(value),
    value,
  }))

  const linePath = buildLinePath(normalizedPoints)
  const benchPath = normalizedBench ? buildLinePath(normalizedBench) : ''
  const predictionPath = normalizedPrediction.length > 0
    ? buildLinePath([{ x: normalizedPoints.at(-1)?.x ?? 0, y: normalizedPoints.at(-1)?.y ?? 0 }, ...normalizedPrediction])
    : ''
  const compactYearLabels = width < 460 && normalizedPoints.length > 5
  const compactPredictionLabels = width < 460 && normalizedPrediction.length > 1

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const svgMouseX = (mouseX / rect.width) * width

    let closestIndex = 0
    let minDistance = Infinity
    normalizedPoints.forEach((p, i) => {
      const distance = Math.abs(p.x - svgMouseX)
      if (distance < minDistance) {
        minDistance = distance
        closestIndex = i
      }
    })
    setHoverIndex(closestIndex)
  }

  const activeBenchmarkPoint = hoverIndex !== null ? benchmarkPoints?.[hoverIndex] ?? null : null

  if (points.length === 0) {
    return (
      <section className={combinedClasses} ref={animRef as React.RefObject<HTMLElement>}>
        {showHeader && (
          <div className="dashboard-card__head">
            <div className="panel-heading__stack">
              <h3 className="dashboard-card__title">{title}</h3>
            </div>
          </div>
        )}
        <div className="dashboard-card__body">
          <div className="chart-empty-state">尚無資料</div>
        </div>
      </section>
    )
  }

  return (
    <section className={combinedClasses} ref={animRef as React.RefObject<HTMLElement>}>
      {showHeader && (
        <div className="dashboard-card__head">
          <div className="panel-heading__stack">
            <h3 className="dashboard-card__title">{title}</h3>
            <p className="dashboard-card__subtitle">{subtitle}</p>
          </div>
        </div>
      )}

      <div className="dashboard-card__body">
        <div className="chart-svg-frame" ref={containerRef}>
      <svg
        className="trend-chart"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${title} 歷年趨勢折線圖`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={`${chartId}-area`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-trend-gradient-start)" />
            <stop offset="100%" stopColor="var(--chart-trend-gradient-end)" />
          </linearGradient>
        </defs>

        {[0, 0.33, 0.66, 1].map((ratio) => {
          const y = paddingY + ratio * (height - paddingY * 2)
          return <line key={ratio} className="trend-chart__grid" x1={paddingX} x2={width - paddingX} y1={y} y2={y} />
        })}

        {benchPath && (
          <path className="trend-chart__bench" d={benchPath} fill="none" strokeDasharray="4 2" />
        )}

        <path className="trend-chart__line" d={linePath} ref={pathRef} style={{ strokeDasharray: dashArray }} />

        {predictionPath ? <path className="trend-chart__prediction" d={predictionPath} /> : null}

        {normalizedPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x} cy={p.y} r={p.year === activeYear ? 5 : 3}
            className={p.year === activeYear ? 'trend-chart__point trend-chart__point--active' : 'trend-chart__point'}
            tabIndex={0}
            role="button"
            aria-label={`${formatAcademicYearCompact(p.year)} ${formatValue(p.value)}`}
            onFocus={() => setHoverIndex(i)}
            onBlur={() => setHoverIndex(null)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setHoverIndex(i)
              }
            }}
          />
        ))}

        {normalizedPrediction.map((point) => (
          <g key={`prediction-${point.year}`}>
            <circle cx={point.x} cy={point.y} r={3} className="trend-chart__point trend-chart__point--predicted" />
            <text className="trend-chart__label trend-chart__label--predicted" x={point.x} y={height - 6} textAnchor="middle">
              {formatAcademicYearCompact(point.year)}
            </text>
          </g>
        ))}

        {hoverIndex !== null && (
          <g className="trend-chart__crosshair">
            <line x1={normalizedPoints[hoverIndex].x} x2={normalizedPoints[hoverIndex].x} y1={paddingY} y2={height - paddingY} />
            <circle cx={normalizedPoints[hoverIndex].x} cy={normalizedPoints[hoverIndex].y} r={6} fill="none" className="trend-chart__crosshair-ring" />
            {(() => {
              const px = normalizedPoints[hoverIndex].x
              const py = normalizedPoints[hoverIndex].y
              const tooltipW = 100
              const tooltipH = activeBenchmarkPoint ? 60 : 40
              // X boundary: flip left if too close to right edge
              const tx = px > width - tooltipW - 20 ? px - tooltipW - 10 : px + 10
              // Y boundary: ensure tooltip stays within chart area
              let ty = py - 20
              if (ty < paddingY) ty = paddingY
              if (ty + tooltipH > height - paddingY) ty = height - paddingY - tooltipH
              return (
                <g transform={`translate(${tx}, ${ty})`}>
                  <rect className="chart-svg-tooltip__surface" width={tooltipW} height={tooltipH} rx="6" />
                  <text className="chart-svg-tooltip__title" x="10" y="16">{formatAcademicYearCompact(normalizedPoints[hoverIndex].year)}</text>
                  <text className="chart-svg-tooltip__value" x="10" y="30">{formatValue(normalizedPoints[hoverIndex].value)}</text>
                  {activeBenchmarkPoint ? (
                    <text className="trend-chart__tooltip-row" x="10" y="46">{benchmarkLabel} {formatValue(activeBenchmarkPoint.value)}</text>
                  ) : null}
                </g>
              )
            })()}
          </g>
        )}

        {normalizedPoints.map((point, index) => {
          const showLabel = !compactYearLabels || index === 0 || index === normalizedPoints.length - 1 || index % 2 === 0
          if (!showLabel) {
            return null
          }

          return (
            <text key={point.year} className="trend-chart__label" x={point.x} y={height - 6} textAnchor="middle">
              {formatAcademicYearCompact(point.year)}
            </text>
          )
        })}
      </svg>
      </div>
      {(benchmarkPoints && benchmarkPoints.length > 0) || normalizedPrediction.length > 0 ? (
        <div className="trend-chart__legend" aria-hidden="true">
          <span className="trend-chart__legend-item">
            <span className="trend-chart__legend-swatch trend-chart__legend-swatch--primary" />
            <span>主要趨勢</span>
          </span>
          {benchmarkPoints && benchmarkPoints.length > 0 ? (
            <span className="trend-chart__legend-item">
              <span className="trend-chart__legend-swatch trend-chart__legend-swatch--benchmark" />
              <span>{benchmarkLabel}</span>
            </span>
          ) : null}
          {normalizedPrediction.length > 0 ? (
            <span className="trend-chart__legend-item">
              <span className="trend-chart__legend-swatch trend-chart__legend-swatch--prediction" />
              <span>{predictionLabel}</span>
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="trend-chart__footnote">
        <span>{benchmarkPoints && benchmarkPoints.length > 0 ? '實線為目前趨勢，藍綠點虛線為基準參考，琥珀虛線為線性預測。' : '實線為目前趨勢；若延伸虛線出現，代表未來兩學年的線性預測。'}</span>
        {compactPredictionLabels ? <span>窄寬度已自動稀疏年份標籤，避免底部擁擠。</span> : null}
      </div>
    </div>
    </section>
  )
}

export default TrendChart
