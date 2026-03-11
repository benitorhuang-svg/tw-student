import { useState } from 'react'
import { formatStudents } from '../lib/analytics'
import { useChartAnimation } from '../hooks/useChartAnimation'

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
  const r = size / 2
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
      <div style={{ position: 'relative', width: size, height: size, maxWidth: '100%', aspectRatio: '1' }}>
        <svg className={isVisible ? 'chart-enter' : ''} width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', height: '100%' }}>
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
            const color = PIE_COLORS[i % PIE_COLORS.length]

            return (
              <path
                key={slice.label}
                d={d}
                fill={color}
                stroke={isActive ? '#fff' : 'none'}
                strokeWidth={isActive ? 2 : 0}
                opacity={hoveredIndex === null || isActive ? 1 : 0.4}
                className="pie-chart__slice"
                tabIndex={0}
                role="listitem"
                aria-label={`${slice.label}: ${(slice.share * 100).toFixed(1)}%`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(i)}
                onBlur={() => setHoveredIndex(null)}
              />
            )
          })}
        </svg>
        <div className="pie-chart__center">
          <div className="pie-chart__center-label">{hoveredIndex !== null ? slices[hoveredIndex].label : centerLabel}</div>
          <div className="pie-chart__center-value">
            {hoveredIndex !== null ? (slices[hoveredIndex].share * 100).toFixed(0) + '%' : formatStudents(totalValue)}
          </div>
        </div>
      </div>

      <div className="pie-chart-legend">
        {slices.map((slice, i) => (
          <div
            key={slice.label}
            className="pie-chart-legend__row"
            style={{ opacity: hoveredIndex === null || hoveredIndex === i ? 1 : 0.4, borderLeft: `3px solid ${PIE_COLORS[i % PIE_COLORS.length]}` }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <span className="pie-chart-legend__label" style={{ paddingLeft: '4px' }}>{slice.label}</span>
            <span className="pie-chart-legend__value">{(slice.share * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PieChart
