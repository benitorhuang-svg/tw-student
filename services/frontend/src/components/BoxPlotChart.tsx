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
  className?: string
  flat?: boolean
  showHeader?: boolean
  highlightValue?: number
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

function BoxPlotChart({
  title,
  subtitle,
  groups,
  activeGroupId = null,
  className,
  flat,
  showHeader = true,
  highlightValue,
}: BoxPlotChartProps) {
  const { containerRef, width, height } = useResponsiveSvg(620, 260, { minWidth: 320 })
  const padding = { top: 20, right: 16, bottom: 42, left: 50 }

  const { ref, isVisible } = useChartAnimation()
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)

  const combinedClasses = [
    'dashboard-card',
    'box-plot-chart',
    flat ? 'dashboard-card--flat' : '',
    isVisible ? 'chart-enter chart-enter--visible' : 'chart-enter',
    className || ''
  ].filter(Boolean).join(' ')

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
    <section className={combinedClasses} ref={ref as React.RefObject<HTMLElement>}>
      {showHeader && (
        <div className="dashboard-card__head">
          <div className="panel-heading__stack">
            <h3 className="dashboard-card__title">{title}</h3>
            {subtitle && <p className="dashboard-card__subtitle">{subtitle}</p>}
          </div>
        </div>
      )}

      <div className="dashboard-card__body">
        <div className="chart-svg-frame" ref={containerRef}>
      <svg className="box-plot-chart__svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={title}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + ratio * (height - padding.top - padding.bottom)
          const value = Math.round(maxValue * (1 - ratio))
          return (
            <g key={ratio}>
              <line className="box-plot-chart__grid" x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
              <text className="box-plot-chart__axis" x={padding.left - 8} y={y + 4} textAnchor="end">{formatStudents(value)}</text>
            </g>
          )
        })}

        {preparedGroups.map((group, index) => {
          const centerX = padding.left + stepX * index + stepX / 2
          const isActive = group.id === activeGroupId || group.id === hoveredGroupId
          const medianLabelY = Math.max((isVisible ? toY(group.q3) : bottomY) - 8, padding.top + 12)

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
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setHoveredGroupId(group.id) } }}
              className={`box-plot-chart__group${isActive ? ' box-plot-chart__group--active' : ''}${!isActive && (hoveredGroupId || activeGroupId) ? ' box-plot-chart__group--muted' : ''}`}
            >
              <line className="box-plot-chart__whisker"
                x1={centerX} x2={centerX}
                y1={isVisible ? toY(group.min) : bottomY} y2={isVisible ? toY(group.max) : bottomY}
              />
              <line className="box-plot-chart__cap"
                x1={centerX - boxWidth * 0.3} x2={centerX + boxWidth * 0.3}
                y1={isVisible ? toY(group.min) : bottomY} y2={isVisible ? toY(group.min) : bottomY}
              />
              <line className="box-plot-chart__cap"
                x1={centerX - boxWidth * 0.3} x2={centerX + boxWidth * 0.3}
                y1={isVisible ? toY(group.max) : bottomY} y2={isVisible ? toY(group.max) : bottomY}
              />
              <rect className="box-plot-chart__box"
                x={centerX - boxWidth / 2} y={isVisible ? toY(group.q3) : bottomY}
                width={boxWidth} height={isVisible ? Math.max(toY(group.q1) - toY(group.q3), 4) : 0} rx={4}
              />
              <line className="box-plot-chart__median"
                x1={centerX - boxWidth / 2} x2={centerX + boxWidth / 2}
                y1={isVisible ? toY(group.median) : bottomY} y2={isVisible ? toY(group.median) : bottomY}
              />

              {highlightValue !== undefined && (
                <g className="box-plot-chart__highlight">
                   <circle
                     cx={centerX}
                     cy={isVisible ? toY(highlightValue) : bottomY}
                     r="6"
                     fill="#ef4444"
                     stroke="#fff"
                     strokeWidth="2"
                     filter="drop-shadow(0 0 4px rgba(239, 68, 68, 0.5))"
                   />
                   <text
                     x={centerX + 12}
                     y={isVisible ? toY(highlightValue) : bottomY}
                     fontSize="10"
                     fontWeight="900"
                     fill="#ef4444"
                     dominantBaseline="middle"
                   >
                     本校: {formatStudents(highlightValue)}
                   </text>
                </g>
              )}

              {/* Median value label */}
              <text
                className={`box-plot-chart__median-label${isActive ? ' box-plot-chart__median-label--visible' : ''}`}
                x={centerX}
                y={medianLabelY}
              >
                {formatStudents(Math.round(group.median))}
              </text>
              <text className="box-plot-chart__label" x={centerX} y={height - 12} textAnchor="middle">
                {group.label}
              </text>
            </g>
          )
        })}
      </svg>
      </div>

      <div className="box-plot-chart__legend">
        {preparedGroups.map((group) => (
          <span key={group.id} className={hoveredGroupId !== null && hoveredGroupId !== group.id ? 'box-plot-chart__legend-item box-plot-chart__legend-item--muted' : 'box-plot-chart__legend-item'}>{group.label} 中位數 {formatStudents(Math.round(group.median))} 人</span>
        ))}
      </div>
      </div>
    </section>
  )
}

export default BoxPlotChart