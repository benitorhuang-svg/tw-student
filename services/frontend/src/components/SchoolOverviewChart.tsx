import { useMemo, useState } from 'react'

import type { TrendPoint } from '../lib/analytics.types'
import type { AcademicYear } from '../hooks/types'
import { formatAcademicYear, formatDelta, formatStudents } from '../lib/analytics'
import { useChartAnimation } from '../hooks/useChartAnimation'
import { useResponsiveSvg } from '../hooks/useResponsiveSvg'

type SchoolOverviewChartProps = {
  trend: TrendPoint[]
  activeYear: AcademicYear
  schoolName: string
  schoolCode?: string
  educationLevel?: string
  managementType?: string
  address?: string
  phone?: string
  website?: string
}

const CHART_W = 520
const CHART_H = 200
const BAR_FILL = 'var(--chart-bar-primary, #f0abfc)'
const BAR_FILL_ACTIVE = 'var(--chart-bar-active, #93c5fd)'

function SchoolOverviewChart({ trend, activeYear, schoolName, schoolCode, educationLevel, managementType, address, phone, website }: SchoolOverviewChartProps) {
  const { ref, isVisible: mounted } = useChartAnimation()
  const { containerRef, width, height } = useResponsiveSvg(CHART_W, CHART_H, { minWidth: 240, minHeight: 180 })
  const [detailYear, setDetailYear] = useState<number | null>(null)
  const PAD = useMemo(() => ({
    top: 16,
    right: width < 360 ? 16 : 24,
    bottom: width < 360 ? 34 : 28,
    left: width < 360 ? 40 : 52,
  }), [width])
  const INNER_W = width - PAD.left - PAD.right
  const INNER_H = height - PAD.top - PAD.bottom
  const bars = useMemo(() => {
    if (trend.length === 0) return []
    const maxVal = Math.max(...trend.map((p) => p.value), 1)
    const barW = Math.min(INNER_W / trend.length - 2, 28)
    const stepX = INNER_W / trend.length

    return trend.map((point, i) => {
      const h = (point.value / maxVal) * INNER_H
      return {
        year: point.year,
        value: point.value,
        x: PAD.left + stepX * i + (stepX - barW) / 2,
        y: PAD.top + INNER_H - h,
        w: barW,
        h,
        cx: PAD.left + stepX * i + stepX / 2,
      }
    })
  }, [INNER_H, INNER_W, PAD.left, PAD.top, trend])

  const ratePoints = useMemo(() => {
    if (bars.length < 2) return []
    const rates = bars.map((bar, i) => {
      if (i === 0) return { year: bar.year, rate: 0, cx: bar.cx }
      const prev = bars[i - 1].value
      return { year: bar.year, rate: prev > 0 ? ((bar.value - prev) / prev) * 100 : 0, cx: bar.cx }
    })
    const maxAbs = Math.max(...rates.map((r) => Math.abs(r.rate)), 1)
    const midY = PAD.top + INNER_H * 0.5
    const scale = (INNER_H * 0.35) / maxAbs
    return rates.map((r) => ({ ...r, y: midY - r.rate * scale }))
  }, [INNER_H, PAD.top, bars])

  const ratePath = ratePoints.length >= 2
    ? `M${ratePoints.map((p) => `${p.cx},${p.y}`).join(' L')}`
    : ''

  const yTicks = bars.length === 0 ? [] : (() => {
    const maxVal = Math.max(...bars.map((bar) => bar.value), 1)
    const step = Math.pow(10, Math.floor(Math.log10(maxVal)))
    const ticks: number[] = []
    for (let value = 0; value <= maxVal + step; value += step) {
      ticks.push(value)
      if (ticks.length >= 5) break
    }

    return ticks.map((value) => ({
      value,
      y: PAD.top + INNER_H - (value / maxVal) * INNER_H,
      label: value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value),
    }))
  })()

  const activeBar = bars.find((b) => b.year === activeYear)
  const prevBar = activeBar ? bars[bars.indexOf(activeBar) - 1] : undefined
  const activeDelta = activeBar && prevBar ? activeBar.value - prevBar.value : 0
  const activeRate = prevBar && prevBar.value > 0 ? ((activeDelta) / prevBar.value) * 100 : 0
  const detailedBar = bars.find((bar) => bar.year === (detailYear ?? activeYear)) ?? activeBar ?? null
  const detailedBarIndex = detailedBar ? bars.findIndex((bar) => bar.year === detailedBar.year) : -1
  const detailedPrevBar = detailedBarIndex > 0 ? bars[detailedBarIndex - 1] : undefined
  const detailedDelta = detailedBar && detailedPrevBar ? detailedBar.value - detailedPrevBar.value : 0

  return (
    <div className="school-overview-chart" ref={ref as React.RefObject<HTMLDivElement>}>
      <div className="school-overview-chart__header">
        <p className="eyebrow">MOE 校別概況</p>
        <h3>{schoolName} 歷年學生數</h3>
        {schoolCode ? (
          <div className="school-overview-chart__info">
            <span>學校代碼 {schoolCode}</span>
            {educationLevel ? <span>{managementType ?? ''}{educationLevel}</span> : null}
            {address ? <span title={address}>{address.length > 24 ? `${address.slice(0, 24)}…` : address}</span> : null}
            {phone ? <span>{phone}</span> : null}
            {website ? <a href={website} target="_blank" rel="noopener noreferrer" className="school-overview-chart__link">校網</a> : null}
          </div>
        ) : null}
        <p className="panel-heading__meta">
          柱狀為各學年學生數，折線為年增率。
          {activeBar ? ` ${formatAcademicYear(activeYear)}：${formatStudents(activeBar.value)} 人，增減 ${formatDelta(activeDelta)} 人（${activeRate >= 0 ? '+' : ''}${activeRate.toFixed(1)}%）` : ''}
        </p>
      </div>

      <div className="chart-svg-frame" ref={containerRef}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="school-overview-chart__svg" role="img" aria-label={`${schoolName} 歷年學生數柱狀圖`}>
        {yTicks.map((tick) => (
          <g key={tick.value}>
            <line x1={PAD.left} x2={width - PAD.right} y1={tick.y} y2={tick.y} className="school-overview-chart__grid" />
            <text className="school-overview-chart__axis" x={PAD.left - 6} y={tick.y + 3} textAnchor="end">{tick.label}</text>
          </g>
        ))}

        {bars.map((bar, i) => {
          const prevVal = i > 0 ? bars[i - 1].value : null
          const delta = prevVal != null ? bar.value - prevVal : null
          return (
            <g key={bar.year}>
              <rect
                x={bar.x}
                y={mounted ? bar.y : PAD.top + INNER_H}
                width={bar.w}
                height={mounted ? bar.h : 0}
                rx={2}
                className={bar.year === activeYear ? 'school-overview-chart__bar school-overview-chart__bar--active chart-data-focusable' : 'school-overview-chart__bar chart-data-focusable'}
                fill={bar.year === activeYear ? BAR_FILL_ACTIVE : BAR_FILL}
                tabIndex={0}
                role="button"
                aria-label={`${bar.year} 學年，${formatStudents(bar.value)} 人`}
                onMouseEnter={() => setDetailYear(bar.year)}
                onMouseLeave={() => setDetailYear(null)}
                onFocus={() => setDetailYear(bar.year)}
                onBlur={() => setDetailYear(null)}
              />
              {bar.year === activeYear && delta != null ? (
                <text x={bar.cx} y={bar.y - 4} textAnchor="middle" className={delta >= 0 ? 'school-overview-chart__delta school-overview-chart__delta--positive' : 'school-overview-chart__delta school-overview-chart__delta--negative'}>
                  {delta >= 0 ? '+' : ''}{delta}
                </text>
              ) : null}
              {(width >= 320 || i % 2 === 0) ? <text className="school-overview-chart__year-label" x={bar.cx} y={height - 6} textAnchor="middle">{bar.year}</text> : null}
            </g>
          )
        })}

        {ratePath ? (
          <>
            <path
              d={ratePath}
              fill="none"
              strokeLinejoin="round"
              className="school-overview-chart__rate-line"
              strokeDasharray="500"
              strokeDashoffset={mounted ? 0 : 500}
            />
            {ratePoints.map((p) => (
              <circle key={p.year} className="school-overview-chart__rate-dot" cx={p.cx} cy={p.y} r={2.5} tabIndex={0} role="button" aria-label={`${p.year} 年增率 ${p.rate.toFixed(1)}%`} onFocus={() => setDetailYear(p.year)} onBlur={() => setDetailYear(null)} onMouseEnter={() => setDetailYear(p.year)} onMouseLeave={() => setDetailYear(null)} />
            ))}
          </>
        ) : null}

        {activeBar ? (
          <line x1={activeBar.cx} x2={activeBar.cx} y1={PAD.top} y2={PAD.top + INNER_H} className="school-overview-chart__active-line" />
        ) : null}
      </svg>
      {detailedBar ? (
        <div className="chart-tooltip chart-tooltip--visible school-overview-chart__tooltip" role="note" aria-live="polite">
          <div className="chart-tooltip__title">{detailedBar.year} 學年</div>
          <div className="chart-tooltip__row">
            <span>學生數</span>
            <span className="chart-tooltip__value">{formatStudents(detailedBar.value)} 人</span>
          </div>
          {detailedPrevBar ? (
            <div className="chart-tooltip__row">
              <span>年增減</span>
              <span className="chart-tooltip__value">{formatDelta(detailedDelta)} 人</span>
            </div>
          ) : null}
        </div>
      ) : null}
      </div>

      <div className="school-overview-chart__legend">
        <span className="school-overview-chart__legend-item">
          <span className="school-overview-chart__swatch school-overview-chart__swatch--bar" />
          學生數
        </span>
        <span className="school-overview-chart__legend-item">
          <span className="school-overview-chart__swatch school-overview-chart__swatch--line" />
          年增率
        </span>
      </div>

      {trend.length >= 2 ? (
        <table className="school-overview-chart__table">
          <thead>
            <tr>
              <th>學年度</th>
              {trend.map((p) => <th key={p.year}>{p.year}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>學生數</td>
              {trend.map((p) => <td key={p.year}>{formatStudents(p.value)}</td>)}
            </tr>
            <tr>
              <td>年增減</td>
              {trend.map((p, i) => {
                const d = i > 0 ? p.value - trend[i - 1].value : 0
                return <td key={p.year} className={d > 0 ? 'positive' : d < 0 ? 'negative' : ''}>{i > 0 ? formatDelta(d) : '—'}</td>
              })}
            </tr>
          </tbody>
        </table>
      ) : null}
    </div>
  )
}

export default SchoolOverviewChart
