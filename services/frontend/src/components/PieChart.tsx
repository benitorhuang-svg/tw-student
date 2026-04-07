import { useState } from 'react'
import { formatStudents } from '../lib/analytics'
import { useChartAnimation } from '../hooks/useChartAnimation'
import { useResponsiveSvg } from '../hooks/useResponsiveSvg'

const PIE_COLORS = [
  'var(--chart-pie-0, #38bdf8)', 'var(--chart-pie-1, #34d399)',
  'var(--chart-pie-2, #fbbf24)', 'var(--chart-pie-3, #fb923c)',
  'var(--chart-pie-4, #a855f7)', 'var(--chart-pie-5, #94a3b8)',
]

type Slice = {
  label: string
  value: number
  share: number
}

type PieChartProps = {
  slices: Slice[]
  size?: number
  centerLabel?: string
}

function PieChart({ slices, size = 160, centerLabel = '總計' }: PieChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const { ref: animRef, isVisible } = useChartAnimation()
  const { containerRef, width } = useResponsiveSvg(size, size, { minWidth: 120, minHeight: 120 })
  const chartSize = Math.max(width, 120)
  const r = chartSize / 2
  const innerR = r * 0.65
  const totalValue = slices.reduce((acc, s) => acc + s.value, 0)

  if (slices.length === 0 || totalValue === 0) {
    return (
      <div className="pie-chart-wrap">
        <div className="chart-empty-state">尚無資料</div>
      </div>
    )
  }

  const startOffset = -Math.PI / 2
  const cumulativeAngles = slices.reduce<number[]>((acc, slice) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : startOffset
    acc.push(prev + slice.share * Math.PI * 2)
    return acc
  }, [])

  return (
    <div className="pie-chart-wrap" ref={animRef as React.RefObject<HTMLDivElement>}>
      <div className="pie-chart__canvas" ref={containerRef}>
        <svg className={isVisible ? 'chart-enter chart-enter--visible' : 'chart-enter'} width={chartSize} height={chartSize} viewBox={`0 0 ${chartSize} ${chartSize}`} role="img" aria-label={`比例圓餅圖，總計 ${formatStudents(totalValue)} 人。${slices.slice(0, 3).map(s => `${s.label} ${(s.share * 100).toFixed(1)}%`).join('、')}${slices.length > 3 ? ` 等 ${slices.length} 項` : ''}`}>
          {slices.map((slice, i) => {
            let angle = slice.share * Math.PI * 2
            // Clamp near-full-circle arcs to avoid degenerate SVG path (start == end)
            if (angle > Math.PI * 2 - 0.001) angle = Math.PI * 2 - 0.001
            const sliceStart = i === 0 ? startOffset : cumulativeAngles[i - 1]
            const endAngle = sliceStart + angle

            const x1 = r + r * Math.cos(sliceStart)
            const y1 = r + r * Math.sin(sliceStart)
            const x2 = r + r * Math.cos(endAngle)
            const y2 = r + r * Math.sin(endAngle)

            const ix1 = r + innerR * Math.cos(endAngle)
            const iy1 = r + innerR * Math.sin(endAngle)
            const ix2 = r + innerR * Math.cos(sliceStart)
            const iy2 = r + innerR * Math.sin(sliceStart)

            const large = angle > Math.PI ? 1 : 0
            const d = [`M ${x1} ${y1}`, `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`, `L ${ix1} ${iy1}`, `A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2}`, 'Z'].join(' ')

            const isActive = hoveredIndex === i

            return (
              <path
                key={slice.label}
                d={d}
                className={`pie-chart__slice pie-chart__slice--${i % PIE_COLORS.length}${isActive ? ' pie-chart__slice--active' : ''}${hoveredIndex !== null && !isActive ? ' pie-chart__slice--muted' : ''}`}
                tabIndex={0}
                role="listitem"
                aria-label={`${slice.label}: ${(slice.share * 100).toFixed(1)}%`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(i)}
                onBlur={() => setHoveredIndex(null)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setHoveredIndex(i)
                  }
                }}
              />
            )
          })}
        </svg>
        {hoveredIndex !== null ? (
          <div className="chart-tooltip chart-tooltip--visible pie-chart__tooltip" role="note" aria-live="polite">
            <div className="chart-tooltip__title">{slices[hoveredIndex].label}</div>
            <div className="chart-tooltip__row">
              <span className="chart-tooltip__value">{(slices[hoveredIndex].share * 100).toFixed(1)}%</span>
              <span>{formatStudents(slices[hoveredIndex].value)} 人</span>
            </div>
          </div>
        ) : null}
        <div className="pie-chart__center">
          <div className="pie-chart__center-label">{hoveredIndex !== null ? slices[hoveredIndex].label : centerLabel}</div>
          <div className="pie-chart__center-value">
            {hoveredIndex !== null ? (slices[hoveredIndex].share * 100).toFixed(0) + '%' : formatStudents(totalValue)}
          </div>
        </div>
      </div>

      <div className="pie-chart-legend">
        {slices.map((slice, i) => (
          <button
            key={slice.label}
            type="button"
            className={hoveredIndex === null || hoveredIndex === i ? 'pie-chart-legend__row pie-chart-legend__button' : 'pie-chart-legend__row pie-chart-legend__button pie-chart-legend__row--muted'}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            onFocus={() => setHoveredIndex(i)}
            onBlur={() => setHoveredIndex(null)}
          >
            <span className={`pie-chart-legend__swatch pie-chart-legend__swatch--${i % PIE_COLORS.length}`} />
            <span className="pie-chart-legend__label">{slice.label}</span>
            <span className="pie-chart-legend__value">{(slice.share * 100).toFixed(1)}%</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default PieChart
