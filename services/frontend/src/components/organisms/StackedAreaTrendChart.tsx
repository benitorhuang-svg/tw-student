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

const formatValue = (val: number) => {
  if (Math.abs(val) >= 10000) {
    return `${(val / 10000).toFixed(1)}萬`
  }
  return val.toLocaleString()
}

const formatDelta = (delta: number) => {
  const sign = delta > 0 ? '+' : (delta < 0 ? '-' : '')
  if (delta === 0) return '0'
  
  const absDelta = Math.abs(delta)
  if (absDelta < 10000) {
    return `${sign}${absDelta.toLocaleString()}`
  }
  
  const val = absDelta / 10000
  const formatted = val < 0.1 ? val.toFixed(2) : val.toFixed(1)
  return `${sign}${formatted}萬`
}

const TrendValueBadge = ({ x, y, delta }: { x: number, y: number, delta: number }) => {
  // Use pure white with a stronger shadow for maximum clarity on colored bars
  const deltaColor = delta === 0 ? 'rgba(255,255,255,0.8)' : '#ffffff'

  return (
    <g style={{ pointerEvents: 'none' }}>
      <text
        x={x}
        y={y}
        textAnchor="middle"
        fontSize="11" // Slightly larger for better readability
        fontWeight="1000"
        fill={deltaColor}
        style={{ 
          filter: 'drop-shadow(0 0.5px 2px rgba(0,0,0,0.7))',
          letterSpacing: '-0.01em'
        }}
      >
        {formatDelta(delta)}
      </text>
    </g>
  )
}

export function StackedAreaTrendChart({ title, subtitle, series, children, className, flat, showHeader = true }: StackedAreaTrendChartProps & { children?: React.ReactNode }) {
  // Collapse whitespace by tightening height and top padding
  // Increase height from 320 to 440 for more prominent bars ("不小器")
  // Increase height from 280 to 360 to accommodate bottom labels
  const { ref: animRef, isVisible } = useChartAnimation()

  const dataSeries = series.map(s => ({
    ...s,
    points: s.points.filter(p => p.year >= 100) // Keep reasonable history
  }))

  const isSingleSeries = dataSeries.length <= 1
  const baseH = isSingleSeries ? 260 : 420
  const { containerRef, width, height: responsiveHeight } = useResponsiveSvg(800, baseH, { minWidth: 340, minHeight: 200 })
  const height = Math.min(responsiveHeight, isSingleSeries ? 320 : 520) 

  const paddingLeft = isSingleSeries ? 20 : (width < 520 ? 60 : 85) 
  const paddingRight = width < 420 ? 10 : 20
  const paddingTop = isSingleSeries ? 40 : 32 // More space for labels
  const paddingBottom = 40 // Reduced since we only show year numbers

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

  const maxTotal = Math.max(...yearTotals, 100)
  // More buffer for breathing space (1.3x)
  const maxValue = maxTotal * (isSingleSeries ? 1.3 : 1.1) 

  const chartInnerWidth = width - paddingLeft - paddingRight
  const chartInnerHeight = height - paddingTop - paddingBottom

  const getValueY = (val: number) => paddingTop + chartInnerHeight - (val / maxValue) * chartInnerHeight
  const barWidth = (chartInnerWidth / dataYears.length) * 0.65



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

            <line x1={paddingLeft} x2={width - paddingRight} y1={getValueY(0)} y2={getValueY(0)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2 2" />

            {/* Molecule: Left Side Category Labels (Legend) - Only show for multiple series */}
            {!isSingleSeries && dataSeries.map((s, sIdx) => {
              // Align with the first year's segment for consistent reference
              const firstYear = dataYears[0]
              const val = s.points.find(pt => pt.year === firstYear)?.value ?? 0
              const stackBaseVal = dataSeries.slice(0, sIdx).reduce((sum, prevSeries) => {
                return sum + (prevSeries.points.find(pt => pt.year === firstYear)?.value ?? 0)
              }, 0)
              const yCenter = (getValueY(stackBaseVal) + getValueY(stackBaseVal + val)) / 2

              // Standardize Category Names
              const standardizedName = s.label.replace('院校', '')

              return (
                <g key={`leg-${s.label}`}>
                  {/* Category Label - Dot removed as per request */}
                  <text 
                    x={20} // Slightly moved in 
                    y={yCenter} 
                    alignmentBaseline="middle" 
                    fontSize="13" 
                    fontWeight="800" 
                    fill="#334155"
                    style={{ letterSpacing: '0.02em' }}
                  >
                    {standardizedName}
                  </text>
                </g>
              )
            })}

            {/* Molecule: Grouped Yearly Stacked Bars */}
            {dataSeries.map((s, sIdx) => {
              const points = dataYears.map((year, yearIdx) => {
                const x = paddingLeft + (yearIdx + 0.5) * (chartInnerWidth / dataYears.length)
                const currentVal = s.points.find(pt => pt.year === year)?.value ?? 0
                const stackBaseVal = dataSeries.slice(0, sIdx).reduce((sum, prevSeries) => {
                  return sum + (prevSeries.points.find(pt => pt.year === year)?.value ?? 0)
                }, 0)
                
                const y0 = getValueY(stackBaseVal)
                const y1 = getValueY(stackBaseVal + currentVal)
                
                return { x, y0, y1, val: currentVal, year }
              })

              return (
                <g key={s.label} className="stacked-bar-series">
                  {points.map((p) => (
                    <rect
                      key={`bar-${p.year}`}
                      x={p.x - barWidth / 2}
                      y={p.y1}
                      width={barWidth}
                      height={Math.max(p.y0 - p.y1, 0.5)}
                      fill={`url(#bar-grad-${sIdx % SERIES_COLORS.length})`}
                      opacity="0.9"
                      rx="2"
                    />
                  ))}
                </g>
              )
            })}

            {/* Total Trend Line - Only one subtle line for the overall total if desired, but here we favor pure bars */}
            <path
              d={dataYears.reduce((acc, _year, i) => {
                const x = paddingLeft + (i + 0.5) * (chartInnerWidth / dataYears.length)
                const y = getValueY(yearTotals[i])
                if (i === 0) return `M ${x} ${y}`
                const xPrev = paddingLeft + (i - 0.5) * (chartInnerWidth / dataYears.length)
                const yPrev = getValueY(yearTotals[i-1])
                const cp1x = xPrev + (x - xPrev) / 3
                const cp2x = xPrev + (x - xPrev) * 2 / 3
                return `${acc} C ${cp1x} ${yPrev}, ${cp2x} ${y}, ${x} ${y}`
              }, '')}
              stroke="rgba(0,0,0,0.1)"
              strokeWidth="2"
              fill="none"
              strokeDasharray="4 4"
            />

            {/* Molecule: Per-Year Indicators (Labels, Badges) */}
            {dataYears.map((year, yearIdx) => {
              const barXCenter = paddingLeft + (yearIdx + 0.5) * (chartInnerWidth / dataYears.length)
              const prevTotal = yearIdx > 0 ? yearTotals[yearIdx - 1] : null
              const totalDelta = prevTotal !== null ? yearTotals[yearIdx] - prevTotal : null
              const totalDeltaPct = prevTotal && prevTotal > 0 ? ((yearTotals[yearIdx] - prevTotal) / prevTotal) * 100 : null

              return (
                <g key={year} className="trend-molecule--indicator-group">
                  {/* Top Labels: Total Value + % Change Badge */}
                  <g transform={`translate(${barXCenter}, ${getValueY(yearTotals[yearIdx]) - 10})`}>
                    <text
                      y={-18}
                      textAnchor="middle"
                      fontSize="14"
                      fontWeight="900"
                      fill="#1e293b"
                    >
                      {formatValue(yearTotals[yearIdx])}
                    </text>
                    
                    {totalDelta !== null && (
                      <g transform={`translate(0, 0)`}>
                        <rect x="-22" y="-9" width="44" height="15" rx="5" fill={totalDelta === 0 ? '#94a3b8' : (totalDelta > 0 ? '#10b981' : '#f43f5e')} opacity="0.15" />
                        <text x="0" y="2.5" textAnchor="middle" fontSize="10.5" fontWeight="900" fill={totalDelta === 0 ? '#64748b' : (totalDelta > 0 ? '#059669' : '#e11d48')}>
                          {totalDeltaPct !== null ? `${totalDeltaPct > 0 ? '+' : ''}${totalDeltaPct.toFixed(1)}%` : ''}
                        </text>
                      </g>
                    )}
                  </g>

                  {/* Bottom Labels: Year Only */}
                  <text
                    x={barXCenter}
                    y={getValueY(0) + 24}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="800"
                    fill="#64748b"
                  >
                    {year}
                  </text>
                  
                  {/* Per-segment Deltas */}
                  {dataSeries.map((s, sIdx) => {
                    const p = s.points.find(pt => pt.year === year)
                    const val = p ? p.value : 0
                    const prevYearVal = yearIdx > 0 ? (s.points.find(pt => pt.year === dataYears[yearIdx - 1])?.value ?? 0) : null
                    const delta = prevYearVal !== null ? val - prevYearVal : 0
                    const stackBaseVal = dataSeries.slice(0, sIdx).reduce((sum, prevSeries) => {
                      return sum + (prevSeries.points.find(pt => pt.year === year)?.value ?? 0)
                    }, 0)
                    const ySegmentTop = getValueY(stackBaseVal + val)
                    const ySegmentBottom = getValueY(stackBaseVal)
                    const yCenter = (ySegmentTop + ySegmentBottom) / 2

                    // Lowered threshold to 10px since we have more vertical space now
                    if (ySegmentBottom - ySegmentTop < 10) return null

                    return (
                      <g key={s.label}>
                         <TrendValueBadge
                          x={barXCenter}
                          y={yCenter + 4}
                          delta={delta}
                        />
                      </g>
                    )
                  })}
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
