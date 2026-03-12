import { useState } from 'react'
import type { TrendPoint } from '../lib/analytics'
import { formatAcademicYearCompact, formatStudents } from '../lib/analytics'
import { useChartAnimation } from '../hooks/useChartAnimation'
import { useResponsiveSvg } from '../hooks/useResponsiveSvg'

const formatWanNumeric = (val: number) => {
  if (val === 0) return '0'
  return `${+(val / 10000).toFixed(1)}`
}

const formatWanWithUnit = (val: number) => {
  if (val === 0) return '0'
  return `${+(val / 10000).toFixed(0)}萬`
}

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
  const { containerRef, width, height } = useResponsiveSvg(680, 270, { minWidth: 340 })

  const paddingLeft = width < 420 ? 35 : 45
  const paddingRight = 140
  const paddingTop = 25
  const paddingBottom = 35

  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const { ref: animRef, isVisible } = useChartAnimation()

  const dataSeries = series.map(s => ({
    ...s,
    points: s.points.filter(p => p.year >= 108)
  }))

  const dataYears = Array.from(new Set(dataSeries.flatMap((item) => item.points.map((point) => point.year)))).sort((left, right) => left - right)

  if (dataYears.length === 0) {
    return (
      <section className="stacked-area-chart stacked-area-chart--framed">
        <div className="panel-heading"><h3>{title}</h3></div>
        <div className="chart-empty-state">尚無資料</div>
      </section>
    )
  }

  const yearTotals = dataYears.map(year =>
    dataSeries.reduce((sum, s) => sum + (s.points.find(p => p.year === year)?.value ?? 0), 0)
  )

  // --- FULLY DYNAMIC Y-AXIS LOGIC ---
  const lastYearTotal = yearTotals[yearTotals.length - 1]

  // 1. Calculate dynamic step based on magnitude
  let stepSize = 500000 // Default 50W for large numbers
  if (lastYearTotal < 1000000) stepSize = 100000 // 10W if under 100W
  if (lastYearTotal < 300000) stepSize = 50000 // 5W if under 30W
  if (lastYearTotal < 100000) stepSize = 10000 // 1W if under 10W

  // 2. Set maxValue to the next step from LAST YEAR TOTAL
  // (e.g., 336W / 50W -> 6.72 -> ceil is 7 -> 7 * 50W = 350W)
  const maxValue = Math.ceil(lastYearTotal / stepSize) * stepSize

  // 3. Generate grid values (Skip 0 as requested)
  const gridValues = []
  for (let v = stepSize; v <= maxValue; v += stepSize) {
    gridValues.push(v)
  }

  const chartInnerWidth = width - paddingLeft - paddingRight
  const chartInnerHeight = height - paddingTop - paddingBottom

  const getValueY = (val: number) => paddingTop + chartInnerHeight - (val / maxValue) * chartInnerHeight
  const barWidth = (chartInnerWidth / dataYears.length) * 0.82
  const firstYearSegments = dataSeries.reduce<Array<{ label: string; color: string; centerY: number }>>((segments, current, index) => {
    const previousTotal = dataSeries
      .slice(0, index)
      .reduce((sum, seriesItem) => sum + (seriesItem.points.find((point) => point.year === dataYears[0])?.value ?? 0), 0)
    const currentValue = current.points.find((point) => point.year === dataYears[0])?.value ?? 0
    const startY = getValueY(previousTotal)
    const endY = getValueY(previousTotal + currentValue)

    segments.push({
      label: current.label,
      color: SERIES_COLORS[index % SERIES_COLORS.length],
      centerY: (startY + endY) / 2,
    })
    return segments
  }, [])

  return (
    <section className="stacked-area-chart stacked-area-chart--framed" ref={animRef as React.RefObject<HTMLElement>}>
      {/* Header */}
      <div className="panel-heading stacked-area-chart__heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', marginBottom: '8px' }}>
        <h3 className="stacked-area-chart__title" style={{ margin: 0 }}>{title}</h3>
        <p className="panel-heading__meta" style={{ margin: 0, textAlign: 'right', maxWidth: '60%', fontSize: '0.85rem' }}>{subtitle}</p>
      </div>

      <div className="chart-svg-frame" ref={containerRef} style={{ position: 'relative' }}>
        <svg
          className={`stacked-area-chart__svg${isVisible ? ' chart-enter chart-enter--visible' : ' chart-enter'}`}
          viewBox={`0 0 ${width} ${height}`}
          onMouseLeave={() => setHoverIndex(null)}
          style={{ overflow: 'visible' }}
        >
          {/* Base line only (0 but no text) */}
          <line
            x1={paddingLeft}
            x2={width - paddingRight}
            y1={getValueY(0)}
            y2={getValueY(0)}
            stroke="rgba(148,163,184,0.1)"
          />

          {/* Education Level Labels */}
          {firstYearSegments.map((segment) => (
            <text
              key={`label-${segment.label}`}
              x={paddingLeft - 10}
              y={segment.centerY + 4}
              textAnchor="end"
              fontSize="12"
              fontWeight="600"
              fill={segment.color}
            >
              {segment.label.replace('院校', '')}
            </text>
          ))}

          {/* Horizontal Grid & Right Y-Axis (Dynamic steps) */}
          <g className="grid">
            {gridValues.map(val => {
              const y = getValueY(val)
              return (
                <g key={val}>
                  <line
                    x1={paddingLeft}
                    x2={width - paddingRight}
                    y1={y}
                    y2={y}
                    strokeDasharray="4 4"
                    stroke="rgba(148,163,184,0.15)"
                  />
                  <text
                    x={width - paddingRight + 8}
                    y={y + 4}
                    textAnchor="start"
                    fontSize="10"
                    fill="#94a3b8"
                  >
                    {lastYearTotal < 100000 ? formatStudents(val) : formatWanWithUnit(val)}
                  </text>
                </g>
              )
            })}
          </g>

          {/* Bars */}
          {dataYears.map((year, yearIdx) => {
            const barXCenter = paddingLeft + (yearIdx + 0.5) * (chartInnerWidth / dataYears.length)
            let currentStackedValue = 0
            const prevTotal = yearIdx > 0 ? yearTotals[yearIdx - 1] : null
            const totalDeltaPct = prevTotal && prevTotal > 0 ? ((yearTotals[yearIdx] - prevTotal) / prevTotal) * 100 : null

            return (
              <g key={year}>
                <text
                  x={barXCenter}
                  y={getValueY(0) + 24}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#94a3b8"
                  fontWeight="700"
                >
                  {year}
                </text>

                {dataSeries.map((s, sIdx) => {
                  const p = s.points.find(pt => pt.year === year)
                  if (!p || p.value === 0) return null

                  const startY = getValueY(currentStackedValue)
                  const endY = getValueY(currentStackedValue + p.value)
                  const segmentHeight = startY - endY
                  const isHovered = hoverIndex === yearIdx

                  currentStackedValue += p.value

                  return (
                    <g key={s.label} onMouseEnter={() => setHoverIndex(yearIdx)}>
                      <rect
                        x={barXCenter - barWidth / 2}
                        y={endY}
                        width={barWidth}
                        height={Math.max(segmentHeight, 0.5)}
                        fill={SERIES_COLORS[sIdx % SERIES_COLORS.length]}
                        opacity={hoverIndex === null || isHovered ? 0.9 : 0.4}
                        style={{ transition: 'all 0.3s ease' }}
                        stroke="#fff"
                        strokeWidth="0.5"
                      />
                      {/* Inner segment label showing value ONLY */}
                      {segmentHeight > 18 && (
                        <text
                          x={barXCenter}
                          y={endY + segmentHeight / 2 + 3}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="700"
                          fill="#fff"
                          style={{ pointerEvents: 'none', filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.3))' }}
                        >
                          {formatWanNumeric(p.value)}
                        </text>
                      )}
                    </g>
                  )
                })}

                {/* Yearly Statistics Above Bar */}
                <g opacity={hoverIndex === null || hoverIndex === yearIdx ? 1 : 0.4} style={{ pointerEvents: 'none' }}>
                  <text
                    x={barXCenter}
                    y={getValueY(yearTotals[yearIdx]) - 16}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="700"
                    fill="#1e293b"
                  >
                    {formatWanWithUnit(yearTotals[yearIdx])}
                  </text>
                  {totalDeltaPct !== null ? (
                    <text
                      x={barXCenter}
                      y={getValueY(yearTotals[yearIdx]) - 6}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="600"
                      fill={Math.abs(totalDeltaPct) < 0.01 ? '#94a3b8' : (totalDeltaPct > 0 ? '#10b981' : '#f43f5e')}
                    >
                      ({totalDeltaPct > 0 ? '+' : ''}{totalDeltaPct.toFixed(1)}%)
                    </text>
                  ) : (
                    <text
                      x={barXCenter}
                      y={getValueY(yearTotals[yearIdx]) - 6}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="600"
                      fill="#94a3b8"
                    >
                      (-)
                    </text>
                  )}
                </g>
              </g>
            )
          })}
        </svg>

        {/* Hover Tooltip - Positioned on the right, aligned with year labels at the bottom */}
        {hoverIndex !== null && (
          <div className="chart-tooltip chart-tooltip--visible" style={{ position: 'absolute', bottom: 0, right: 0, width: paddingRight - 10, pointerEvents: 'none', background: 'rgba(255,255,255,0.98)', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: '8px', color: '#0f172a', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '4px', fontSize: '12px' }}>
              {formatAcademicYearCompact(dataYears[hoverIndex])}學年度
            </div>
            {[...dataSeries].reverse().map((s, idx) => {
              const p = s.points.find(pt => pt.year === dataYears[hoverIndex!])
              const prevP = hoverIndex! > 0 ? s.points.find(pt => pt.year === dataYears[hoverIndex! - 1]) : null
              if (!p) return null

              const deltaPct = prevP && prevP.value > 0 ? ((p.value - prevP.value) / prevP.value) * 100 : null
              const realIdx = dataSeries.length - 1 - idx

              return (
                <div key={s.label} style={{ display: 'flex', flexDirection: 'column', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
                    <span style={{ color: SERIES_COLORS[realIdx % SERIES_COLORS.length] }}>{s.label.replace('院校', '')}</span>
                    <span style={{ color: '#0f172a' }}>{formatStudents(p.value)}</span>
                  </div>
                  {deltaPct !== null ? (
                    <div style={{ fontSize: '10px', textAlign: 'right', color: Math.abs(deltaPct) < 0.01 ? '#94a3b8' : (deltaPct >= 0 ? '#059669' : '#dc2626'), fontWeight: 600 }}>
                      {Math.abs(deltaPct) < 0.01 ? '0.0%' : `${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}%`}
                    </div>
                  ) : (
                    <div style={{ fontSize: '10px', textAlign: 'right', color: '#94a3b8', fontWeight: 600 }}>-</div>
                  )}
                </div>
              )
            })}
            <div style={{ marginTop: '8px', borderTop: '1.5px solid #f1f5f9', paddingTop: '6px', fontSize: '11px' }}>
              <div style={{ fontWeight: 800, color: '#0f172a', display: 'flex', justifyContent: 'space-between' }}>
                <span>總計</span>
                <span>{formatStudents(yearTotals[hoverIndex])}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default StackedAreaTrendChart
