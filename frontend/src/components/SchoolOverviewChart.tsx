import { useMemo } from 'react'

import type { TrendPoint } from '../lib/analytics.types'
import type { AcademicYear } from '../hooks/types'
import { formatAcademicYear, formatDelta, formatStudents } from '../lib/analytics'
import { useChartAnimation } from '../hooks/useChartAnimation'

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
const PAD = { top: 16, right: 24, bottom: 28, left: 52 }
const INNER_W = CHART_W - PAD.left - PAD.right
const INNER_H = CHART_H - PAD.top - PAD.bottom
const BAR_FILL = 'var(--chart-bar-primary, #f0abfc)'
const BAR_FILL_ACTIVE = 'var(--chart-bar-active, #93c5fd)'
const RATE_STROKE = 'var(--chart-rate-stroke, #fb7185)'

function SchoolOverviewChart({ trend, activeYear, schoolName, schoolCode, educationLevel, managementType, address, phone, website }: SchoolOverviewChartProps) {
  const { ref, isVisible: mounted } = useChartAnimation()
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
  }, [trend])

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
  }, [bars])

  const ratePath = ratePoints.length >= 2
    ? `M${ratePoints.map((p) => `${p.cx},${p.y}`).join(' L')}`
    : ''

  const yTicks = useMemo(() => {
    if (bars.length === 0) return []
    const maxVal = Math.max(...bars.map((b) => b.value), 1)
    const step = Math.pow(10, Math.floor(Math.log10(maxVal)))
    const ticks: number[] = []
    for (let v = 0; v <= maxVal + step; v += step) {
      ticks.push(v)
      if (ticks.length >= 5) break
    }
    return ticks.map((v) => ({
      value: v,
      y: PAD.top + INNER_H - (v / maxVal) * INNER_H,
      label: v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
    }))
  }, [bars])

  const activeBar = bars.find((b) => b.year === activeYear)
  const prevBar = activeBar ? bars[bars.indexOf(activeBar) - 1] : undefined
  const activeDelta = activeBar && prevBar ? activeBar.value - prevBar.value : 0
  const activeRate = prevBar && prevBar.value > 0 ? ((activeDelta) / prevBar.value) * 100 : 0

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

      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="xMidYMid meet" className="school-overview-chart__svg" role="img" aria-label={`${schoolName} 歷年學生數柱狀圖`}>
        {yTicks.map((tick) => (
          <g key={tick.value}>
            <line x1={PAD.left} x2={CHART_W - PAD.right} y1={tick.y} y2={tick.y} stroke="var(--color-border, #334155)" strokeOpacity={0.3} />
            <text x={PAD.left - 6} y={tick.y + 3} textAnchor="end" fontSize={9} fill="var(--color-text-muted, #94a3b8)">{tick.label}</text>
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
                fill={bar.year === activeYear ? BAR_FILL_ACTIVE : BAR_FILL}
                opacity={bar.year === activeYear ? 1 : 0.7}
                style={{ transition: 'y 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
              />
              {bar.year === activeYear && delta != null ? (
                <text x={bar.cx} y={bar.y - 4} textAnchor="middle" fontSize={7} fill={delta >= 0 ? '#34d399' : '#fb7185'} fontWeight={600}>
                  {delta >= 0 ? '+' : ''}{delta}
                </text>
              ) : null}
              <text x={bar.cx} y={CHART_H - 6} textAnchor="middle" fontSize={8} fill="var(--color-text-muted, #94a3b8)">
                {bar.year}
              </text>
            </g>
          )
        })}

        {ratePath ? (
          <>
            <path
              d={ratePath}
              fill="none"
              stroke={RATE_STROKE}
              strokeWidth={1.8}
              strokeLinejoin="round"
              opacity={0.85}
              strokeDasharray="500"
              strokeDashoffset={mounted ? 0 : 500}
              style={{ transition: 'stroke-dashoffset 1.2s ease-out 0.3s' }}
            />
            {ratePoints.map((p) => (
              <circle key={p.year} cx={p.cx} cy={p.y} r={2.5} fill={RATE_STROKE} opacity={0.9} />
            ))}
          </>
        ) : null}

        {activeBar ? (
          <line x1={activeBar.cx} x2={activeBar.cx} y1={PAD.top} y2={PAD.top + INNER_H} stroke="#f59e0b" strokeWidth={1.2} strokeDasharray="3 3" opacity={0.6} />
        ) : null}
      </svg>

      <div className="school-overview-chart__legend">
        <span className="school-overview-chart__legend-item">
          <span className="school-overview-chart__swatch" style={{ background: BAR_FILL }} />
          學生數
        </span>
        <span className="school-overview-chart__legend-item">
          <span className="school-overview-chart__swatch school-overview-chart__swatch--line" style={{ background: RATE_STROKE }} />
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
