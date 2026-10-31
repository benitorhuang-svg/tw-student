import { useMemo } from 'react'
import type { AcademicYear } from '@/shared/api/data/educationData'
import { canCompareStudentValues, hasStudentValue, type TrendPoint } from '@/shared/lib/analytics'

type MapTrendCardProps = {
  trend: TrendPoint[]
  activeYear: AcademicYear
  label: string
  level: string
  selectableYears: AcademicYear[]
  onSelectYear: (year: AcademicYear) => void
}

const compactValue = (value: number) => value >= 10000 ? `${(value / 10000).toFixed(1)}萬` : value.toLocaleString('zh-TW')

export const MapTrendCard = ({ trend, activeYear, label, selectableYears, onSelectYear }: MapTrendCardProps) => {
  const data = useMemo(() => {
    const activeIndex = trend.findIndex((point) => point.year === activeYear)
    const lastWindow = Math.max(0, trend.length - 7)
    const start = activeIndex >= 0 ? Math.min(activeIndex, lastWindow) : lastWindow
    return trend.slice(start, start + 7).map((point) => {
      const previous = trend.find((entry) => Number(entry.year) === Number(point.year) - 1)
      return { ...point, valid: hasStudentValue(point), delta: canCompareStudentValues(point, previous) ? point.value - previous!.value : null }
    })
  }, [trend, activeYear])
  const values = data.filter((point) => point.valid).map((point) => point.value)
  if (values.length === 0) return <p className="map-trend-card__empty">目前範圍尚無可用的歷史學生人數紀錄。</p>
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(max - min, max * 0.05, 1)
  const getX = (index: number) => 24 + (index / Math.max(data.length - 1, 1)) * 272
  const getY = (value: number) => 84 - ((value - min) / range) * 45

  return (
    <div className="map-trend-card">
      <div className="map-trend-card__title">年度趨勢 · {label}</div>
      <svg viewBox="0 0 320 128" className="map-trend-card__plot" role="group" aria-label={`${label}近年學生人數，可點選節點或年份切換學年度，缺漏年度不連線`}>
        {data.map((point, index) => {
          const previous = data[index - 1]
          const x = getX(index)
          const y = getY(point.value)
          const canSelect = selectableYears.includes(point.year)
          return (
            <g key={point.year}>
              {point.valid && previous?.valid && Number(point.year) === Number(previous.year) + 1 && (
                <line x1={getX(index - 1)} y1={getY(previous.value)} x2={x} y2={y}
                  stroke={point.delta != null && point.delta < 0 ? '#e11d48' : 'var(--brand-primary)'} strokeWidth="2" pointerEvents="none" />
              )}
              <g
                className="map-trend-card__year-control"
                role={canSelect ? 'button' : undefined}
                tabIndex={canSelect ? 0 : undefined}
                aria-label={canSelect ? `切換至 ${point.year} 學年度` : undefined}
                aria-pressed={canSelect ? point.year === activeYear : undefined}
                onClick={canSelect ? () => onSelectYear(point.year) : undefined}
                onKeyDown={canSelect ? (event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  event.stopPropagation()
                  onSelectYear(point.year)
                } : undefined}
              >
                {canSelect && <rect x={x - 21} y={0} width={42} height={128} rx={5} className="map-trend-card__year-hit-area" />}
                {point.valid ? (
                  <>
                    <circle cx={x} cy={y} r={point.year === activeYear ? 4.5 : 2.5}
                      data-year={point.year} data-active-year={point.year === activeYear}
                      fill={point.year === activeYear ? 'var(--brand-primary)' : 'var(--surface-card)'}
                      stroke="var(--brand-primary)" strokeWidth="2" />
                    <text x={x} y={y - 10} textAnchor="middle" className="map-trend-card__plot-label">{compactValue(point.value)}</text>
                  </>
                ) : <text x={x} y={66} textAnchor="middle" className="map-trend-card__plot-label">—</text>}
                <text x={x} y={116} textAnchor="middle" className="map-trend-card__plot-year" fontWeight={point.year === activeYear ? 750 : 500}>{point.year}</text>
                <title>{point.year} 學年度：{point.valid ? `${point.value.toLocaleString('zh-TW')} 人` : '資料缺漏'}</title>
              </g>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
