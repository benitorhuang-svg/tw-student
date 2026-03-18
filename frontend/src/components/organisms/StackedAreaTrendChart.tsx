import React from 'react'
import type { TrendPoint } from '../../lib/analytics'
import { useChartAnimation } from '../../hooks/useChartAnimation'
import { useResponsiveSvg } from '../../hooks/useResponsiveSvg'
import '../../styles/data/charts/01-historical-trend-redesign.css'



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
  { start: '#38bdf8', end: '#0ea5e9', glow: 'rgba(56, 189, 248, 0.4)' }, // Cyan
  { start: '#34d399', end: '#10b981', glow: 'rgba(52, 211, 153, 0.4)' }, // Emerald
  { start: '#fbbf24', end: '#f59e0b', glow: 'rgba(251, 191, 36, 0.4)' }, // Amber
  { start: '#f87171', end: '#ef4444', glow: 'rgba(248, 113, 113, 0.4)' }, // Rose
  { start: '#a855f7', end: '#8b5cf6', glow: 'rgba(168, 85, 247, 0.4)' }, // Purple
]

// --- Atoms ---


const TrendYearLabel = ({ x, y, year }: { x: number, y: number, year: number | string }) => (
  <text x={x} y={y} textAnchor="middle" className="year-label">
    {year}
  </text>
)

const formatDelta = (delta: number) => {
  if (delta === 0) return '--'
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toLocaleString()}`
}

const TrendValueBadge = ({ x, y, delta, segmentHeight }: { x: number, y: number, delta: number, segmentHeight: number }) => {
  const isCompact = segmentHeight < 26 // More generous threshold
  const fontSize = isCompact ? 8.5 : 11.5 // Increased from 7.5 : 9.5
  const color = delta === 0 ? '#ffffff' : delta > 0 ? '#d1fae5' : '#fecdd3'

  return (
    <g style={{ pointerEvents: 'none' }}>
      <text
        x={x}
        y={y - 2}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="800"
        fill={color}
        style={{ letterSpacing: '-0.02em', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.4))' }}
      >
        {formatDelta(delta)}
      </text>
    </g>
  )
}

export function StackedAreaTrendChart({ title, subtitle, series, children, className, flat, showHeader = true }: StackedAreaTrendChartProps & { children?: React.ReactNode }) {
  // Collapse whitespace by tightening height and top padding
  // Increase height from 320 to 440 for more prominent bars ("不小器")
  const { containerRef, width, height: responsiveHeight } = useResponsiveSvg(800, 240, { minWidth: 340, minHeight: 140 })
  const height = Math.min(responsiveHeight, 280)

  const paddingLeft = width < 420 ? 10 : 20
  const paddingRight = width < 420 ? 10 : 20
  const paddingTop = 15
  const paddingBottom = 10

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
    'dashboard-card--glass',
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

  const maxTotal = Math.max(...yearTotals, 5000)
  // Higher buffer for the floating line
  const rawMaxValue = maxTotal * 1.35 
  const maxValue = rawMaxValue

  const chartInnerWidth = width - paddingLeft - paddingRight
  const chartInnerHeight = height - paddingTop - paddingBottom

  const getValueY = (val: number) => paddingTop + chartInnerHeight - (val / maxValue) * chartInnerHeight
  const barWidth = (chartInnerWidth / dataYears.length) * 0.7 // Balanced bar width for combo



  return (
    <section className={combinedClasses} ref={animRef as React.RefObject<HTMLElement>}>
      {showHeader && (title || children) && (
        <div className="dashboard-card__head">
          <div className="panel-heading__stack">
            {title && <h3 className="dashboard-card__title">{title}</h3>}
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
            style={{ overflow: 'visible' }}
          >
            <defs>
              {SERIES_COLORS.map((clr, idx) => (
                <React.Fragment key={`defs-${idx}`}>
                  <linearGradient id={`bar-grad-${idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={clr.start} />
                    <stop offset="100%" stopColor={clr.end} />
                  </linearGradient>
                  <filter id={`glow-${idx}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
                    <feFlood floodColor={clr.glow} result="flood" />
                    <feComposite in="flood" in2="blur" operator="in" result="glow" />
                    <feMerge>
                      <feMergeNode in="glow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </React.Fragment>
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
              <linearGradient id="grid-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(203, 213, 225, 0)" />
                <stop offset="50%" stopColor="rgba(203, 213, 225, 0.4)" />
                <stop offset="100%" stopColor="rgba(203, 213, 225, 0)" />
              </linearGradient>
            </defs>

            {/* Molecules: Grid removed as per minimal request */}
            <line x1={paddingLeft} x2={width - paddingRight} y1={getValueY(0)} y2={getValueY(0)} stroke="#e2e8f0" strokeWidth="1.5" />

            {/* Molecule: Combo Series (Bars + Line) */}
            {dataSeries.map((s, sIdx) => {
              const points = dataYears.map((year, yearIdx) => {
                const x = paddingLeft + (yearIdx + 0.5) * (chartInnerWidth / dataYears.length)
                const p = s.points.find(pt => pt.year === year)
                const val = p ? p.value : 0
                const y = getValueY(val) 
                return { x, y, val, year }
              })

              if (points.length < 2) return null

              const pathD = points.reduce((acc, p, i, arr) => {
                if (i === 0) return `M ${p.x} ${p.y}`
                const prev = arr[i - 1]
                const cp1x = prev.x + (p.x - prev.x) / 3
                const cp2x = prev.x + (p.x - prev.x) * 2 / 3
                return `${acc} C ${cp1x} ${prev.y}, ${cp2x} ${p.y}, ${p.x} ${p.y}`
              }, '')

              return (
                <g key={s.label} className="combo-series">
                  {/* Structural Bars - Showing Volume with headcount */}
                  {points.map((p) => (
                    <g key={`bar-group-${p.year}`}>
                      <rect
                        x={p.x - barWidth / 2}
                        y={p.y + 20} // Slightly lower than the trend point
                        width={barWidth}
                        height={Math.max(getValueY(0) - (p.y + 20), 0.5)}
                        fill={`url(#bar-grad-${sIdx % SERIES_COLORS.length})`}
                        opacity="0.1"
                        rx="6"
                      />
                      <text
                        x={p.x}
                        y={p.y + 36}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="900"
                        fill={SERIES_COLORS[sIdx % SERIES_COLORS.length].start}
                        style={{ letterSpacing: '0.05em' }}
                      >
                        {p.val.toLocaleString()}
                      </text>
                    </g>
                  ))}

                  {/* Floating Trend Line - Zoomed performance hint */}
                  <path
                    d={pathD}
                    stroke={`url(#bar-grad-${sIdx % SERIES_COLORS.length})`}
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: `url(#glow-${sIdx % SERIES_COLORS.length})` }}
                  />
                </g>
              )
            })}

            {/* Molecule: Per-Year Indicators (Labels, Badges) */}
            {dataYears.map((year, yearIdx) => {
              const barXCenter = paddingLeft + (yearIdx + 0.5) * (chartInnerWidth / dataYears.length)
              const prevTotal = yearIdx > 0 ? yearTotals[yearIdx - 1] : null
              const totalDelta = prevTotal !== null ? yearTotals[yearIdx] - prevTotal : null
              const totalDeltaPct = prevTotal && prevTotal > 0 ? ((yearTotals[yearIdx] - prevTotal) / prevTotal) * 100 : null

              return (
                <g key={year} className="trend-molecule--indicator-group">
                  <TrendYearLabel x={barXCenter} y={getValueY(0) + 16} year={year} />
                  
                  {dataSeries.map((s) => {
                    const p = s.points.find(pt => pt.year === year)
                    const val = p ? p.value : 0
                    const prevYearVal = yearIdx > 0 ? (s.points.find(pt => pt.year === dataYears[yearIdx - 1])?.value ?? 0) : null
                    const delta = prevYearVal !== null ? val - prevYearVal : 0
                    const y = getValueY(val)

                    return (
                      <g key={s.label}>
                         <TrendValueBadge
                          x={barXCenter}
                          y={y + 24}
                          delta={delta}
                          segmentHeight={30}
                        />
                      </g>
                    )
                  })}

                  <g style={{ pointerEvents: 'none' }}>
                    {totalDelta !== null && (
                      <g transform={`translate(${barXCenter}, ${getValueY(yearTotals[yearIdx]) - 22})`}>
                        <rect x="-24" y="-9" width="48" height="15" rx="6" fill={totalDelta === 0 ? '#94a3b8' : (totalDelta > 0 ? '#10b981' : '#f43f5e')} opacity="0.15" />
                        <text x="0" y="2.5" textAnchor="middle" fontSize="11" fontWeight="900" fill={totalDelta === 0 ? '#64748b' : (totalDelta > 0 ? '#059669' : '#e11d48')}>
                          {totalDeltaPct !== null ? `${totalDeltaPct > 0 ? '+' : ''}${totalDeltaPct.toFixed(1)}%` : ''}
                        </text>
                      </g>
                    )}
                  </g>
                </g>
              )
            })}

            {/* Molecule: Side Labels Removed as per request (redundant with title) */}
          </svg>

        </div>
      </div>
    </section>
  )
}

export default StackedAreaTrendChart
