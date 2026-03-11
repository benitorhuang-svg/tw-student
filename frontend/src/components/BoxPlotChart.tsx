import { useState } from 'react'
import { useChartAnimation } from '../hooks/useChartAnimation'
import { useResponsiveSvg } from '../hooks/useResponsiveSvg'
import { formatStudents } from '../lib/analytics'

type BoxPlotGroup = {
  id: string
  label: string
  values: number[]
}

type BoxPlotChartProps = {
  title: string
  subtitle: string
  groups: BoxPlotGroup[]
  activeGroupId?: string | null
}

function percentile(values: number[], ratio: number) {
  if (values.length === 0) return 0
  const index = (values.length - 1) * ratio
  const lowerIndex = Math.floor(index)
  const upperIndex = Math.ceil(index)
  if (lowerIndex === upperIndex) return values[lowerIndex]
  const weight = index - lowerIndex
  return values[lowerIndex] * (1 - weight) + values[upperIndex] * weight
}

function BoxPlotChart({ title, subtitle, groups, activeGroupId = null }: BoxPlotChartProps) {
  const { containerRef, width, height } = useResponsiveSvg(620, 260, { minWidth: 320 })
  const padding = { top: 20, right: 16, bottom: 42, left: 50 }

  const { ref, isVisible } = useChartAnimation()
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)

  const preparedGroups = groups
    .map((group) => {
      const values = [...group.values].sort((left, right) => left - right)
      return {
        ...group,
        min: values[0] ?? 0,
        q1: percentile(values, 0.25),
        median: percentile(values, 0.5),
        q3: percentile(values, 0.75),
        max: values.at(-1) ?? 0,
      }
    })
    .filter((group) => group.values.length > 0)

  const maxValue = Math.max(...preparedGroups.map((group) => group.max), 1)
  const stepX = (width - padding.left - padding.right) / Math.max(preparedGroups.length, 1)
  const boxWidth = Math.min(48, stepX * 0.42)
  const toY = (value: number) => height - padding.bottom - (value / maxValue) * (height - padding.top - padding.bottom)
  const bottomY = toY(0)

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className={isVisible ? 'box-plot-chart chart-enter chart-enter--visible' : 'box-plot-chart chart-enter'}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">分布箱形</p>
          <h3>{title}</h3>
        </div>
        <p className="panel-heading__meta">{subtitle}</p>
      </div>

      <div className="chart-svg-frame" ref={containerRef}>
      <svg className="box-plot-chart__svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={title}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + ratio * (height - padding.top - padding.bottom)
          const value = Math.round(maxValue * (1 - ratio))
          return (
            <g key={ratio}>
              <line className="box-plot-chart__grid" x1={padding.left} x2={width - padding.right} y1={y} y2={y} strokeDasharray="4 4" stroke="rgba(255,255,255,0.05)" />
              <text className="box-plot-chart__axis" x={padding.left - 8} y={y + 4} textAnchor="end">{formatStudents(value)}</text>
            </g>
          )
        })}

        {preparedGroups.map((group, index) => {
          const centerX = padding.left + stepX * index + stepX / 2
          const isActive = group.id === activeGroupId || group.id === hoveredGroupId
          const opacity = isActive ? 1 : hoveredGroupId || activeGroupId ? 0.4 : 0.8
          const strokeColor = isActive ? 'var(--palette-brass, #b88746)' : 'var(--palette-cyan, #2a6f91)'
          const fillColor = isActive ? 'rgba(184, 135, 70, 0.25)' : 'rgba(42, 111, 145, 0.18)'

          return (
            <g
              key={group.id}
              onMouseEnter={() => setHoveredGroupId(group.id)}
              onMouseLeave={() => setHoveredGroupId(null)}
              tabIndex={0}
              role="img"
              aria-label={`${group.label} 中位數 ${formatStudents(Math.round(group.median))} 人`}
              onFocus={() => setHoveredGroupId(group.id)}
              onBlur={() => setHoveredGroupId(null)}
              style={{ opacity, transition: 'opacity 0.2s', cursor: 'pointer' }}
            >
              <line className="box-plot-chart__whisker"
                x1={centerX} x2={centerX}
                y1={isVisible ? toY(group.min) : bottomY} y2={isVisible ? toY(group.max) : bottomY}
                stroke={strokeColor} style={{ transition: 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
              />
              <line className="box-plot-chart__cap"
                x1={centerX - boxWidth * 0.3} x2={centerX + boxWidth * 0.3}
                y1={isVisible ? toY(group.min) : bottomY} y2={isVisible ? toY(group.min) : bottomY}
                stroke={strokeColor} style={{ transition: 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
              />
              <line className="box-plot-chart__cap"
                x1={centerX - boxWidth * 0.3} x2={centerX + boxWidth * 0.3}
                y1={isVisible ? toY(group.max) : bottomY} y2={isVisible ? toY(group.max) : bottomY}
                stroke={strokeColor} style={{ transition: 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
              />
              <rect className="box-plot-chart__box"
                x={centerX - boxWidth / 2} y={isVisible ? toY(group.q3) : bottomY}
                width={boxWidth} height={isVisible ? Math.max(toY(group.q1) - toY(group.q3), 4) : 0} rx={4}
                fill={fillColor} stroke={strokeColor} style={{ transition: 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
              />
              <line className="box-plot-chart__median"
                x1={centerX - boxWidth / 2} x2={centerX + boxWidth / 2}
                y1={isVisible ? toY(group.median) : bottomY} y2={isVisible ? toY(group.median) : bottomY}
                stroke={strokeColor} style={{ transition: 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
              />
              {/* Median value label */}
              <text
                className="box-plot-chart__median-label"
                x={centerX + boxWidth / 2 + 6}
                y={isVisible ? toY(group.median) + 3 : bottomY}
                fill={strokeColor}
                fontSize="9"
                fontWeight="700"
                style={{ transition: 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)', opacity: isActive ? 1 : 0 }}
              >
                {formatStudents(Math.round(group.median))}
              </text>
              <text className="box-plot-chart__label" x={centerX} y={height - 12} textAnchor="middle" fill={isActive ? '#fff' : undefined} style={{ transition: 'fill 0.2s' }}>
                {group.label}
              </text>
            </g>
          )
        })}
      </svg>
      </div>

      <div className="box-plot-chart__legend">
        {preparedGroups.map((group) => (
          <span key={group.id} style={{ opacity: hoveredGroupId === null || hoveredGroupId === group.id ? 1 : 0.4, transition: 'opacity 0.2s' }}>{group.label} 中位數 {formatStudents(Math.round(group.median))} 人</span>
        ))}
      </div>
    </section>
  )
}

export default BoxPlotChart