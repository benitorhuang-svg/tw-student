import { useState } from 'react'
import type { TrendPoint } from '../lib/analytics'
import { formatAcademicYearCompact } from '../lib/analytics'
import { useChartAnimation } from '../hooks/useChartAnimation'
import { useResponsiveSvg } from '../hooks/useResponsiveSvg'

const formatWan = (val: number) => {
  if (val === 0) return '0'
  return `${+(val / 10000).toFixed(1)}萬`
}

const formatPct = (val: number) => `${val.toFixed(1)}%`

type Series = {
  label: string
  points: TrendPoint[]
}

type StackedAreaTrendChartProps = {
  title: string
  subtitle: string
  series: Series[]
}

const SERIES_COLORS = [
  'var(--chart-area-0, #38bdf8)',
  'var(--chart-area-1, #34d399)',
  'var(--chart-area-2, #fbbf24)',
  'var(--chart-area-3, #f87171)',
  'var(--chart-area-4, #a855f7)',
]

function StackedAreaTrendChart({ title, subtitle, series }: StackedAreaTrendChartProps) {
  const { containerRef, width, height } = useResponsiveSvg(680, 240, { minWidth: 340 })
  const paddingLeft = width < 420 ? 64 : 110
  const paddingRight = width < 420 ? 20 : 40
  const paddingY = 35

  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'absolute' | 'share' | 'line'>('absolute')
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set())
  const { ref: animRef, isVisible } = useChartAnimation()

  // Filter series data to start from year 108, exclude hidden
  const filteredSeries = series
    .filter(s => !hiddenSeries.has(s.label))
    .map(s => ({
      ...s,
      points: s.points.filter(p => p.year >= 108)
    }))

  // Years to display data for
  const dataYears = Array.from(new Set(filteredSeries.flatMap((item) => item.points.map((point) => point.year)))).sort((left, right) => left - right)

  if (dataYears.length === 0) {
    return (
      <section className="stacked-area-chart stacked-area-chart--framed">
        <div className="panel-heading stacked-area-chart__heading">
          <h3 className="stacked-area-chart__title">{title}</h3>
        </div>
        <div className="chart-empty-state">尚無資料</div>
      </section>
    )
  }

  // Full range including padding for breathing room
  const displayYears: number[] = [107, ...dataYears, 115]

  const totals = dataYears.map((year) => filteredSeries.reduce((sum, item) => sum + (item.points.find((point) => point.year === year)?.value ?? 0), 0))
  const maxTotal = Math.max(...totals, 1)

  const allPointsValues = filteredSeries.flatMap(s => s.points.map(p => p.value))
  const maxSingleValue = Math.max(...allPointsValues, 1)

  const toX = (year: number) => {
    const idx = displayYears.indexOf(year)
    return paddingLeft + (idx * (width - paddingLeft - paddingRight)) / (displayYears.length - 1)
  }
  const toY = (value: number) => {
    if (viewMode === 'share') {
      return height - paddingY - (value / 100) * (height - paddingY * 2)
    }
    const currentMax = viewMode === 'line' ? maxSingleValue : maxTotal
    return height - paddingY - (value / currentMax) * (height - paddingY * 2)
  }

  const processedSeries = filteredSeries.map((item, seriesIndex) => {
    const previousSeries = filteredSeries.slice(0, seriesIndex)

    const points = dataYears.map((year, yearIndex) => {
      const ownValue = item.points.find((p) => p.year === year)?.value ?? 0
      const totalForYear = totals[yearIndex]

      const shareValue = totalForYear > 0 ? (ownValue / totalForYear) * 100 : 0
      const stackedBasePct = previousSeries.reduce((sum, current) => {
        const val = current.points.find((p) => p.year === year)?.value ?? 0
        return sum + (totalForYear > 0 ? (val / totalForYear) * 100 : 0)
      }, 0)

      const stackedBaseAbs = previousSeries.reduce((sum, current) => sum + (current.points.find((p) => p.year === year)?.value ?? 0), 0)

      return {
        year,
        yearIndex,
        value: ownValue,
        shareValue,
        absLabel: formatWan(ownValue),
        shareLabel: formatPct(shareValue),
        stackedTop: viewMode === 'share' ? stackedBasePct + shareValue : stackedBaseAbs + ownValue,
        stackedBottom: viewMode === 'share' ? stackedBasePct : stackedBaseAbs,
        x: toX(year),
        y: toY(ownValue)
      }
    })

    const areaPath = [
      `M ${points[0].x} ${toY(points[0].stackedTop)}`,
      ...points.slice(1).map(p => `L ${p.x} ${toY(p.stackedTop)}`),
      ...[...points].reverse().map(p => `L ${p.x} ${toY(p.stackedBottom)}`),
      'Z'
    ].join(' ')

    const linePath = [
      `M ${points[0].x} ${points[0].y}`,
      ...points.slice(1).map(p => `L ${p.x} ${p.y}`)
    ].join(' ')

    return {
      label: item.label,
      color: SERIES_COLORS[seriesIndex % SERIES_COLORS.length],
      areaPath,
      linePath,
      points
    }
  })

  return (
    <section className="stacked-area-chart stacked-area-chart--framed" ref={animRef as React.RefObject<HTMLElement>}>
      <div className="panel-heading stacked-area-chart__heading stacked-area-chart__heading--split">
        <div className="stacked-area-chart__heading-copy">
          <h3 className="stacked-area-chart__title">{title}</h3>
          <div className="chart-toggle stacked-area-chart__toggle">
            {(['absolute', 'share', 'line'] as const).map(mode => (
              <button
                key={mode}
                data-view-mode={mode}
                className={`ghost-button stacked-area-chart__toggle-button ${viewMode === mode ? 'ghost-button--active' : ''}`}
                onClick={() => setViewMode(mode)}
              >
                {mode === 'absolute' ? '數量' : mode === 'share' ? '比例' : '趨勢'}
              </button>
            ))}
          </div>
        </div>
        <p className="panel-heading__meta stacked-area-chart__meta">
          {subtitle}
        </p>
      </div>

      <div className="chart-svg-frame" ref={containerRef}>
      <svg
        className={`stacked-area-chart__svg${isVisible ? ' chart-enter' : ''}`}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${title} 堆疊面積趨勢圖`}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = (e.clientX - rect.left) * (width / rect.width)
          const index = Math.round(((x - paddingLeft) * (displayYears.length - 1)) / (width - paddingLeft - paddingRight))
          const hoveredYear = displayYears[index]
          if (hoveredYear !== undefined && (dataYears as number[]).includes(hoveredYear)) {
            setHoverIndex((dataYears as number[]).indexOf(hoveredYear))
          } else {
            setHoverIndex(null)
          }
        }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <g className="grid">
          {(viewMode === 'share' ? [0, 25, 50, 75, 100] : [0, 0.5, 1]).map(r => {
            const currentMax = viewMode === 'line' ? maxSingleValue : maxTotal
            const val = viewMode === 'share' ? r : r * currentMax
            const y = toY(val)
            return (
              <g key={r}>
                <line className="stacked-area-chart__grid" x1={paddingLeft} x2={width - paddingRight} y1={y} y2={y} />
                <text className="stacked-area-chart__axis" x={paddingLeft - 12} y={y + 4} textAnchor="end">
                  {viewMode === 'share' ? `${r}%` : formatWan(val)}
                </text>
              </g>
            )
          })}
        </g>

        {viewMode !== 'line' && processedSeries.map((layer) => (
          <path
            key={layer.label}
            d={layer.areaPath}
            className={`stacked-area-chart__area-path stacked-area-chart__series-${processedSeries.indexOf(layer)}`}
            fill={layer.color}
            fillOpacity={hoverIndex === null ? 0.8 : 0.25}
          />
        ))}

        {viewMode === 'line' && processedSeries.map((layer) => (
          <g key={layer.label}>
            <path
              d={layer.linePath}
              stroke={layer.color}
              fill="none"
              className={`stacked-area-chart__line-path stacked-area-chart__series-${processedSeries.indexOf(layer)}`}
              strokeOpacity={hoverIndex === null ? 0.9 : 0.3}
            />
            {layer.points.map((p, i) => (
              <circle
                key={i}
                className="stacked-area-chart__dot"
                cx={p.x} cy={p.y} r={hoverIndex === i ? 5 : 3}
                fill={layer.color}
                opacity={hoverIndex === null || hoverIndex === i ? 1 : 0.3}
              />
            ))}
          </g>
        ))}

        {hoverIndex !== null && viewMode !== 'line' && processedSeries.map((layer) => {
          // Actually we can just redraw the segment or use clipPath
          return (
            <path
              key={`hover-${layer.label}`}
              className="stacked-area-chart__hover-clip"
              d={layer.areaPath}
              fill={layer.color}
              pointerEvents="none"
              clipPath={`inset(0 ${width - toX(hoverIndex + 0.5)}px 0 ${toX(hoverIndex - 0.5)}px)`}
            />
          )
        })}

        {/* 數值標註 */}
        {dataYears.map((year, yearIdx) => {
          const isHovered = hoverIndex === yearIdx
          if (hoverIndex !== null && !isHovered) return null

          // Pre-calculate collision for line mode
          const yearPoints = processedSeries.map((s, sIdx) => ({
            label: s.label,
            color: s.color,
            p: s.points[yearIdx],
            sIdx
          })).sort((a, b) => a.p.y - b.p.y)

          return (
            <g key={`values-${year}`}>
              {yearPoints.map((item, idx) => {
                const { p, color, label } = item
                const rectHeight = viewMode === 'line' ? 20 : (toY(p.stackedBottom) - toY(p.stackedTop))

                let activeY = viewMode === 'line' ? p.y - 12 : (toY(p.stackedTop) + toY(p.stackedBottom)) / 2

                // Simple collision avoidance: if too close to previous label in line mode
                if (viewMode === 'line' && idx > 0) {
                  const prevY = yearPoints[idx - 1].p.y - 12 // Simplified for this pass
                  if (Math.abs(activeY - prevY) < 14) {
                    activeY = prevY - 14 // Push up
                  }
                }

                if (rectHeight < 14 && !isHovered && viewMode !== 'line') return null

                return (
                  <g key={label} className="chart-svg-tooltip__group">
                    <text
                      className="stacked-area-chart__value-label"
                      x={p.x}
                      y={activeY - (yearIdx > 0 && rectHeight > 24 && viewMode !== 'line' ? 6 : 0)}
                      fill={viewMode === 'line' ? color : '#fff'}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {viewMode === 'share' ? p.shareLabel : p.absLabel}
                    </text>
                    {yearIdx > 0 && rectHeight > 24 && viewMode === 'absolute' && (
                      <text
                        className="stacked-area-chart__delta-label"
                        x={p.x}
                        y={activeY + 6}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        {(() => {
                          const prevValue = filteredSeries.find(s => s.label === label)?.points.find(pt => pt.year === dataYears[yearIdx - 1])?.value ?? 0
                          const curValue = filteredSeries.find(s => s.label === label)?.points.find(pt => pt.year === year)?.value ?? 0
                          if (prevValue === 0) return ''
                          const pct = ((curValue - prevValue) / prevValue) * 100
                          return `(${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)`
                        })()}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          )
        })}

        {/* 總額加總 (僅在數量模式顯示) */}
        {viewMode === 'absolute' && dataYears.map((year, i) => {
          const xPos = toX(year)
          const topY = toY(totals[i])

          return (
            <g
              key={`total-${year}`}
              opacity={hoverIndex === null || hoverIndex === i ? 1 : 0.3}
              className="chart-svg-tooltip__group"
            >
              <text
                className="stacked-area-chart__total-label"
                x={xPos}
                y={topY - (i > 0 ? 18 : 10)}
                textAnchor="middle"
              >
                {formatWan(totals[i])}
              </text>
              {i > 0 && (
                <text
                  className={totals[i] > totals[i - 1] ? 'stacked-area-chart__total-delta stacked-area-chart__total-delta--up' : 'stacked-area-chart__total-delta stacked-area-chart__total-delta--down'}
                  x={xPos}
                  y={topY - 6}
                  textAnchor="middle"
                >
                  {(() => {
                    if (totals[i - 1] === 0) return ''
                    const pct = ((totals[i] - totals[i - 1]) / totals[i - 1]) * 100
                    return `(${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)`
                  })()}
                </text>
              )}
            </g>
          )
        })}

        {/* 軸線與標籤 */}
        {dataYears.map((year) => (
          <g key={year}>
            <text
              className="stacked-area-chart__axis"
              x={toX(year)}
              y={height - 8}
              textAnchor="middle"
            >
              {formatAcademicYearCompact(year)}
            </text>
          </g>
        ))}

        {/* 左側學制標籤 */}
        {processedSeries.map((layer) => {
          const p = layer.points[0]
          const midY = viewMode === 'line' ? p.y : (toY(p.stackedTop) + toY(p.stackedBottom)) / 2

          return (
            <g key={`labels-${layer.label}`}>
              <text
                className="stacked-area-chart__series-label"
                x={paddingLeft - 18}
                y={midY}
                fill={layer.color}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {layer.label.replace('院校', '')}
              </text>
            </g>
          )
        })}
      </svg>
      </div>

      {/* Interactive legend — click to toggle series visibility */}
      <div className="stacked-area-chart__legend">
        {series.filter(s => s.points.some(p => p.year >= 108)).map((s, i) => {
          const isHidden = hiddenSeries.has(s.label)
          return (
            <button
              key={s.label}
              type="button"
              className={`stacked-area-chart__legend-item${isHidden ? ' stacked-area-chart__legend-item--hidden' : ''}`}
              data-hidden={isHidden ? 'true' : 'false'}
              onClick={() => {
                setHiddenSeries(prev => {
                  const next = new Set(prev)
                  if (next.has(s.label)) next.delete(s.label)
                  else next.add(s.label)
                  return next
                })
              }}
            >
              <span className={`stacked-area-chart__swatch stacked-area-chart__series-${i}`} />
              <strong>{s.label.replace('院校', '')}</strong>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default StackedAreaTrendChart
