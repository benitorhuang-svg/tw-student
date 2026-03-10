import { useState } from 'react'
import { formatStudents } from '../lib/analytics'

const PIE_COLORS = [
  '#38bdf8', '#34d399', '#fbbf24', '#fb923c', '#a855f7', '#94a3b8'
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

function PieChart({ slices, size = 120, centerLabel = '總計' }: PieChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const r = size / 2
  const innerR = r * 0.65
  const totalValue = slices.reduce((acc, s) => acc + s.value, 0)

  const startOffset = -Math.PI / 2
  let currentAngle = startOffset

  return (
    <div className="pie-chart-wrap">
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {slices.map((slice, i) => {
            const angle = slice.share * Math.PI * 2
            const endAngle = currentAngle + angle

            const x1 = r + r * Math.cos(currentAngle)
            const y1 = r + r * Math.sin(currentAngle)
            const x2 = r + r * Math.cos(endAngle)
            const y2 = r + r * Math.sin(endAngle)

            const ix1 = r + innerR * Math.cos(endAngle)
            const iy1 = r + innerR * Math.sin(endAngle)
            const ix2 = r + innerR * Math.cos(currentAngle)
            const iy2 = r + innerR * Math.sin(currentAngle)

            const large = angle > Math.PI ? 1 : 0
            const d = [`M ${x1} ${y1}`, `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`, `L ${ix1} ${iy1}`, `A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2}`, 'Z'].join(' ')

            const isActive = hoveredIndex === i
            const color = PIE_COLORS[i % PIE_COLORS.length]

            currentAngle += angle

            return (
              <path
                key={slice.label}
                d={d}
                fill={color}
                opacity={hoveredIndex === null || isActive ? 1 : 0.4}
                style={{ transition: 'all 0.3s ease', cursor: 'pointer', transform: isActive ? 'scale(1.05)' : 'none', transformOrigin: 'center' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            )
          })}
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 700 }}>{hoveredIndex !== null ? slices[hoveredIndex].label : centerLabel}</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>
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
