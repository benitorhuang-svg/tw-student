import { useState } from 'react'
import type { TrendPoint } from '../lib/analytics'
import { formatStudents } from '../lib/analytics'
import { useChartAnimation } from '../hooks/useChartAnimation'
import { useResponsiveSvg } from '../hooks/useResponsiveSvg'
import '../styles/data/charts/01-historical-trend-redesign.css'

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
  subtitle?: React.ReactNode
  series: Series[]
  children?: React.ReactNode
  className?: string
  flat?: boolean
  showHeader?: boolean
}

const SERIES_COLORS = [
  { start: '#38bdf8', end: '#0ea5e9' }, // Cyan
  { start: '#34d399', end: '#10b981' }, // Emerald
  { start: '#fbbf24', end: '#f59e0b' }, // Amber
  { start: '#f87171', end: '#ef4444' }, // Rose
  { start: '#a855f7', end: '#8b5cf6' }, // Purple
]

// --- Atoms ---

const TrendLabelBadge = ({ segment, paddingLeft }: { segment: any, paddingLeft: number }) => (
  <g className="trend-atom--label-badge">
    <rect
      x={paddingLeft - 50}
      y={segment.centerY - 8}
      width="42"
      height="16"
      rx="6"
      fill={segment.color}
      opacity="0.12"
    />
    <text
      x={paddingLeft - 12}
      y={segment.centerY + 4}
      textAnchor="end"
      fill={segment.color}
      className="label-badge-text"
    >
      {segment.label.replace('院校', '')}
    </text>
  </g>
)

const TrendYearLabel = ({ x, y, year }: { x: number, y: number, year: number | string }) => (
  <text x={x} y={y} textAnchor="middle" className="year-label">
    {year}
  </text>
)

const TrendValueBadge = ({ x, y, value }: { x: number, y: number, value: number }) => (
  <g style={{ pointerEvents: 'none' }}>
    <rect
      x={x - 18}
      y={y - 7}
      width="36"
      height="14"
      rx="4"
      fill="rgba(255, 255, 255, 0.15)"
    />
    <text
      x={x}
      y={y + 4}
      textAnchor="middle"
      fontSize="10"
      fontWeight="900"
      fill="#fff"
      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)', letterSpacing: '-0.02em' }}
    >
      {formatWanNumeric(value)}
    </text>
  </g>
)

function StackedAreaTrendChart({ title, subtitle, series, children, className, flat, showHeader = true }: StackedAreaTrendChartProps & { children?: React.ReactNode }) {
  // Fix: Use a flatter base ratio and clamp height to avoid massive whitespace on wide screens
  const responsive = useResponsiveSvg(800, 240, { minWidth: 340, minHeight: 180 })
  const width = responsive.width
  const height = Math.min(responsive.height, 220) // Clamped lower to 220px to remove bottom whitespace
  const containerRef = responsive.containerRef

  const paddingLeft = width < 420 ? 30 : 50
  const paddingRight = 60
  const paddingTop = 40 // Increased from 26 to give room for totals and tooltip
  const paddingBottom = 22 // Tightened from 34 to remove blank space

  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const { ref: animRef, isVisible } = useChartAnimation()

  const dataSeries = series.map(s => ({
    ...s,
    points: s.points.filter(p => p.year >= 100) // Keep reasonable history
  }))

  const allYears = Array.from(new Set(dataSeries.flatMap((item) => item.points.map((point) => point.year)))).sort((left, right) => left - right)
  
  // Only show the 7 most recent years
  const dataYears = allYears.slice(-7)

  const combinedClasses = [
    'dashboard-card',
    'historical-trend-chart',
    flat ? 'dashboard-card--flat' : '',
    className || ''
  ].filter(Boolean).join(' ')

  if (dataYears.length === 0) {
    return (
      <section className={combinedClasses} ref={animRef as React.RefObject<HTMLElement>}>
        {showHeader && (
          <div className="dashboard-card__head">
            <h3 className="dashboard-card__title">{title}</h3>
          </div>
        )}
        <div className="dashboard-card__body">
          <div className="chart-empty-state">尚無資料</div>
        </div>
      </section>
    )
  }

  const yearTotals = dataYears.map(year =>
    dataSeries.reduce((sum, s) => sum + (s.points.find(p => p.year === year)?.value ?? 0), 0)
  )

  const lastYearTotal = yearTotals[yearTotals.length - 1]
  let stepSize = 500000
  if (lastYearTotal < 1000000) stepSize = 100000
  if (lastYearTotal < 300000) stepSize = 50000
  if (lastYearTotal < 100000) stepSize = 10000

  const maxValue = Math.ceil(lastYearTotal / stepSize) * stepSize

  const gridValues = []
  for (let v = stepSize; v <= maxValue; v += stepSize) {
    gridValues.push(v)
  }

  const chartInnerWidth = width - paddingLeft - paddingRight
  const chartInnerHeight = height - paddingTop - paddingBottom

  const getValueY = (val: number) => paddingTop + chartInnerHeight - (val / maxValue) * chartInnerHeight
  const barWidth = (chartInnerWidth / dataYears.length) * 0.75

  const firstYearSegments = dataSeries.reduce<Array<{ label: string; color: string; centerY: number }>>((segments, current, index) => {
    const previousTotal = dataSeries
      .slice(0, index)
      .reduce((sum, seriesItem) => sum + (seriesItem.points.find((point) => point.year === dataYears[0])?.value ?? 0), 0)
    const currentValue = current.points.find((point) => point.year === dataYears[0])?.value ?? 0
    const startY = getValueY(previousTotal)
    const endY = getValueY(previousTotal + currentValue)

    segments.push({
      label: current.label,
      color: SERIES_COLORS[index % SERIES_COLORS.length].start,
      centerY: (startY + endY) / 2,
    })
    return segments
  }, [])

  return (
    <section className={combinedClasses} ref={animRef as React.RefObject<HTMLElement>}>
      {showHeader && title && (
        <div className="dashboard-card__head">
          <div className="panel-heading__stack">
            <h3 className="dashboard-card__title">{title}</h3>
            {subtitle && (typeof subtitle === 'string' ? <p className="dashboard-card__subtitle">{subtitle}</p> : subtitle)}
            {children}
          </div>
        </div>
      )}

      <div className="dashboard-card__body" style={{ padding: '0px', overflow: 'visible' }}>
        <div className="chart-svg-frame" ref={containerRef}>
          <svg
            className={`stacked-area-chart__svg${isVisible ? ' chart-enter chart-enter--visible' : ' chart-enter'}`}
            viewBox={`0 0 ${width} ${height}`}
            onMouseLeave={() => setHoverIndex(null)}
            style={{ overflow: 'visible' }}
          >
            <defs>
              {SERIES_COLORS.map((clr, idx) => (
                <linearGradient key={`grad-${idx}`} id={`bar-grad-${idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={clr.start} />
                  <stop offset="100%" stopColor={clr.end} />
                </linearGradient>
              ))}
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                <feOffset dx="0" dy="2" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.2" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Molecules: Grid & Axes */}
            <g className="trend-molecule--grid">
              {gridValues.map(val => (
                <g key={val} opacity="0.4">
                  <line x1={paddingLeft} x2={width - paddingRight} y1={getValueY(val)} y2={getValueY(val)} stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="4 4" />
                  <text x={width - paddingRight + 12} y={getValueY(val) + 4} textAnchor="start" fontSize="10" fill="#64748b" fontWeight="500">
                    {lastYearTotal < 100000 ? formatStudents(val) : formatWanWithUnit(val)}
                  </text>
                </g>
              ))}
              <line x1={paddingLeft} x2={width - paddingRight} y1={getValueY(0)} y2={getValueY(0)} stroke="#e2e8f0" strokeWidth="1.5" />
            </g>

            {/* Molecule: Grouped Data Series */}
            {dataYears.map((year, yearIdx) => {
              const barXCenter = paddingLeft + (yearIdx + 0.5) * (chartInnerWidth / dataYears.length)
              let currentStackedValue = 0
              const prevTotal = yearIdx > 0 ? yearTotals[yearIdx - 1] : null
              const totalDeltaPct = prevTotal && prevTotal > 0 ? ((yearTotals[yearIdx] - prevTotal) / prevTotal) * 100 : null

              return (
                <g key={year} className="trend-molecule--bar-group">
                  <TrendYearLabel x={barXCenter} y={getValueY(0) + 16} year={year} />

                  {dataSeries.map((s, sIdx) => {
                    const p = s.points.find(pt => pt.year === year)
                    if (!p || p.value === 0) return null
                    const startY = getValueY(currentStackedValue)
                    const endY = getValueY(currentStackedValue + p.value)
                    const segmentHeight = startY - endY
                    const isHovered = hoverIndex === yearIdx
                    const isTopSegment = sIdx === dataSeries.length - 1
                    const isBottomSegment = sIdx === 0
                    currentStackedValue += p.value

                    return (
                      <g key={s.label} onMouseEnter={() => setHoverIndex(yearIdx)} className="bar-segment">
                        <rect
                          x={barXCenter - barWidth / 2}
                          y={endY}
                          width={barWidth}
                          height={Math.max(segmentHeight, 0.5)}
                          fill={`url(#bar-grad-${sIdx % SERIES_COLORS.length})`}
                          opacity={hoverIndex === null || isHovered ? 1 : 0.4}
                          rx={isTopSegment || isBottomSegment ? 6 : 0}
                          filter={isHovered ? 'url(#shadow)' : 'none'}
                          style={{ cursor: 'pointer' }}
                        />
                        {!isTopSegment && (
                          <line x1={barXCenter - barWidth / 2} x2={barXCenter + barWidth / 2} y1={endY} y2={endY} stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
                        )}
                        {segmentHeight > 16 && (
                          <TrendValueBadge x={barXCenter} y={endY + segmentHeight / 2} value={p.value} />
                        )}
                      </g>
                    )
                  })}

                  {/* Summary Indicators */}
                  <g opacity={hoverIndex === null || hoverIndex === yearIdx ? 1 : 0.3} style={{ pointerEvents: 'none' }}>
                    <text x={barXCenter} y={getValueY(yearTotals[yearIdx]) - 28} textAnchor="middle" className="total-badge">{formatWanWithUnit(yearTotals[yearIdx])}</text>
                    {totalDeltaPct !== null && (
                      <g transform={`translate(${barXCenter}, ${getValueY(yearTotals[yearIdx]) - 14})`}>
                        <rect x="-20" y="-8" width="40" height="12" rx="4" fill={Math.abs(totalDeltaPct) < 0.01 ? '#94a3b8' : (totalDeltaPct > 0 ? '#10b981' : '#f43f5e')} opacity="0.12" />
                        <text x="0" y="2" textAnchor="middle" fontSize="9" fontWeight="800" fill={Math.abs(totalDeltaPct) < 0.01 ? '#64748b' : (totalDeltaPct > 0 ? '#059669' : '#e11d48')}>
                          {totalDeltaPct > 0 ? '+' : ''}{totalDeltaPct.toFixed(1)}%
                        </text>
                      </g>
                    )}
                  </g>
                </g>
              )
            })}

            {/* Molecule: Side Labels */}
            <g className="trend-molecule--side-labels">
              {firstYearSegments.map((segment) => (
                <TrendLabelBadge key={segment.label} segment={segment} paddingLeft={paddingLeft} />
              ))}
            </g>
          </svg>

          {hoverIndex !== null && (
            <div className="chart-tooltip glass-tooltip chart-tooltip--visible" style={{ 
              position: 'absolute', 
              top: -10, // Shifted up slightly to avoid clipping bottom
              [hoverIndex > dataYears.length / 2 ? 'left' : 'right']: 10, 
              width: 125, 
              pointerEvents: 'none', 
              zIndex: 20 
            }}>
              <div style={{ fontWeight: 800, marginBottom: '-8px', color: '#f8fafc', borderBottom: '1.5px solid rgba(255, 255, 255, 0.15)', paddingBottom: '4px', fontSize: '11px', textAlign: 'right' }}>
                {dataYears[hoverIndex]}學年度
              </div>
              {[...dataSeries].reverse().map((s, idx) => {
                const p = s.points.find(pt => pt.year === dataYears[hoverIndex!])
                const prevP = hoverIndex! > 0 ? s.points.find(pt => pt.year === dataYears[hoverIndex! - 1]) : null
                if (!p) return null

                const deltaPct = prevP && prevP.value > 0 ? ((p.value - prevP.value) / prevP.value) * 100 : null
                const realIdx = dataSeries.length - 1 - idx

                return (
                  <div key={s.label} style={{ marginBottom: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800, alignItems: 'baseline' }}>
                      <span style={{ color: SERIES_COLORS[realIdx % SERIES_COLORS.length].start }}>{s.label.replace('院校', '')}</span>
                      <span style={{ color: '#f8fafc' }}>{formatWanNumeric(p.value)}萬</span>
                    </div>
                    {deltaPct !== null && (
                      <div style={{ fontSize: '9px', textAlign: 'right', color: Math.abs(deltaPct) < 0.01 ? '#64748b' : (deltaPct >= 0 ? '#059669' : '#dc2626'), fontWeight: 800, marginTop: '-2px' }}>
                        {Math.abs(deltaPct) < 0.01 ? '0.0%' : `${deltaPct > 0 ? '↑' : '↓'} ${Math.abs(deltaPct).toFixed(1)}%`}
                      </div>
                    )}
                  </div>
                )
              })}
              <div style={{ marginTop: '6px', borderTop: '1.5px solid rgba(255, 255, 255, 0.15)', paddingTop: '6px' }}>
                <div style={{ fontWeight: 900, color: '#f8fafc', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span>總計</span>
                  <span>{formatWanNumeric(yearTotals[hoverIndex])}萬</span>
                </div>
                {(() => {
                  const prevTotal = hoverIndex > 0 ? yearTotals[hoverIndex - 1] : null;
                  const totalDeltaPct = prevTotal && prevTotal > 0 ? ((yearTotals[hoverIndex] - prevTotal) / prevTotal) * 100 : null;
                  if (totalDeltaPct === null) return null;
                  return (
                    <div style={{ fontSize: '9px', textAlign: 'right', color: Math.abs(totalDeltaPct) < 0.01 ? '#64748b' : (totalDeltaPct >= 0 ? '#059669' : '#dc2626'), fontWeight: 800, marginTop: '-2px' }}>
                      {Math.abs(totalDeltaPct) < 0.01 ? '0.0%' : `${totalDeltaPct > 0 ? '↑' : '↓'} ${Math.abs(totalDeltaPct).toFixed(1)}%`}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default StackedAreaTrendChart
