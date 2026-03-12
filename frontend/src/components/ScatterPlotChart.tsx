import { useChartAnimation } from '../hooks/useChartAnimation'
import { useResponsiveSvg } from '../hooks/useResponsiveSvg'

type ScatterPoint = {
  id: string
  label: string
  x: number
  y: number
  size?: number
  detail?: string
}

type ScatterPlotChartProps = {
  title: string
  subtitle?: string
  xLabel: string
  yLabel: string
  points: ScatterPoint[]
  activePointId?: string | null
  formatX?: (value: number) => string
  formatY?: (value: number) => string
  onHoverPoint?: (id: string | null) => void
  onSelectPoint?: (id: string) => void
  children?: React.ReactNode
  className?: string
  flat?: boolean
  showHeader?: boolean
}

function ScatterPlotChart({
  title, subtitle, xLabel, yLabel, points, activePointId = null,
  formatY = (value) => {
    if (value === 0) return '0%'
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  },
  onHoverPoint, onSelectPoint,
  children,
  className, flat, showHeader = true,
}: ScatterPlotChartProps) {
  const { ref: animRef, isVisible } = useChartAnimation()
  const { containerRef, width, height } = useResponsiveSvg(620, 240, { minWidth: 320 })
  const padding = { top: 10, right: width < 400 ? 24 : 50, bottom: 40, left: width < 400 ? 56 : 100 }
  
  const combinedClasses = [
    'dashboard-card',
    'scatter-chart',
    flat ? 'dashboard-card--flat' : '',
    className || ''
  ].filter(Boolean).join(' ')

  if (points.length === 0) {
    return (
      <section className={combinedClasses} ref={animRef as React.RefObject<HTMLElement>}>
        {showHeader && (
          <div className="dashboard-card__head">
            <div className="panel-heading__stack">
              <h3 className="dashboard-card__title">{title}</h3>
              {subtitle && <p className="dashboard-card__subtitle">{subtitle}</p>}
            </div>
            {children}
          </div>
        )}
        <div className="dashboard-card__body">
          <div className="chart-empty-state">尚無資料</div>
        </div>
      </section>
    )
  }

  const valuesX = points.map((p) => p.x)
  const valuesY = points.map((p) => p.y)

  // Ensure the vertical range spans at least -0.5% to +0.5% for context
  const rawMinY = Math.min(...valuesY, 0)
  const rawMaxY = Math.max(...valuesY, 0)
  const minY = Math.min(Math.floor(rawMinY / 0.5) * 0.5, -0.5) - 0.1
  const maxY = Math.max(Math.ceil(rawMaxY / 0.5) * 0.5, 0.5) + 0.1

  const minX = 0
  const rawMaxX = Math.max(...valuesX, 0)
  const maxX = Math.max(Math.ceil(rawMaxX / 50000) * 50000, 100000)

  const avgX = valuesX.reduce((a, b) => a + b, 0) / valuesX.length

  const rangeX = Math.max(maxX - minX, 1)
  const rangeY = Math.max(maxY - minY, 1)
  const maxSize = Math.max(...points.map((p) => p.size ?? 12), 12)

  const toX = (v: number) => padding.left + ((v - minX) / rangeX) * (width - padding.left - padding.right)
  const toY = (v: number) => height - padding.bottom - ((v - minY) / rangeY) * (height - padding.top - padding.bottom)
  const toR = (v: number | undefined) => 4 + ((v ?? 12) / maxSize) * 10

  const midX = toX(avgX)
  const midY = toY(0)

  return (
    <section className={combinedClasses} ref={animRef as React.RefObject<HTMLElement>}>
      {showHeader && (
        <div className="dashboard-card__head">
          <div className="panel-heading__stack">
            <h3 className="dashboard-card__title">{title}</h3>
            {subtitle && <p className="dashboard-card__subtitle">{subtitle}</p>}
          </div>
          {children}
        </div>
      )}
      
      <div className="dashboard-card__body">
        <div className="chart-svg-frame" ref={containerRef}>
        <svg className={`scatter-chart__svg${width < 420 ? ' scatter-chart__svg--compact' : ''}${isVisible ? ' chart-enter chart-enter--visible' : ' chart-enter'}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${title}${subtitle ? `: ${subtitle}` : ''} 散佈圖`}>
        {/* 四象限淡色背景 */}
        <rect className="scatter-chart__quadrant scatter-chart__quadrant--tl" x={padding.left} y={padding.top} width={midX - padding.left} height={midY - padding.top} rx="2" />
        <rect className="scatter-chart__quadrant scatter-chart__quadrant--tr" x={midX} y={padding.top} width={width - padding.right - midX} height={midY - padding.top} rx="2" />
        <rect className="scatter-chart__quadrant scatter-chart__quadrant--bl" x={padding.left} y={midY} width={midX - padding.left} height={height - padding.bottom - midY} rx="2" />
        <rect className="scatter-chart__quadrant scatter-chart__quadrant--br" x={midX} y={midY} width={width - padding.right - midX} height={height - padding.bottom - midY} rx="2" />

        {/* 四象限格線 */}
        <line className="scatter-chart__zero" x1={midX} x2={midX} y1={padding.top} y2={height - padding.bottom} />
        <line className="scatter-chart__zero" x1={padding.left} x2={width - padding.right} y1={midY} y2={midY} />

        {/* 座標軸線與標註 */}
        {(() => {
          const tickCount = 8
          const rawStep = rangeY / tickCount
          
          // Round step to a "pretty" number (0.1, 0.2, 0.5, 1, 2, 5, 10, etc.)
          const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
          const normalized = rawStep / magnitude
          let step: number
          if (normalized < 1.5) step = 1 * magnitude
          else if (normalized < 3) step = 2 * magnitude
          else if (normalized < 7) step = 5 * magnitude
          else step = 10 * magnitude
          
          const ticks: number[] = []
          const start = Math.floor(minY / step) * step
          for (let v = start; v <= maxY + step * 0.1; v += step) {
             const rounded = Math.round(v * 1000) / 1000 // Avoid float precision mess
             ticks.push(rounded)
          }

          return ticks.map((val) => {
            const y = toY(val)
            if (y < padding.top - 2 || y > height - padding.bottom + 2) return null
            return (
              <text key={val} className="scatter-chart__axis" x={padding.left - 12} y={y + 4} textAnchor="end">
                {formatY(val)}
              </text>
            )
          })
        })()}
        {/* X軸標註 */}
        {(() => {
          const tickCount = Math.max(Math.floor(width / 100), 2)
          const rawStep = rangeX / tickCount
          const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
          const normalized = rawStep / magnitude
          let step: number
          if (normalized < 1.5) step = 1 * magnitude
          else if (normalized < 3) step = 2 * magnitude
          else if (normalized < 7) step = 5 * magnitude
          else step = 10 * magnitude

          const ticks: number[] = []
          for (let v = 0; v <= maxX + step * 0.1; v += step) {
             ticks.push(v)
          }

          return ticks.map((val) => {
            const x = toX(val)
            if (x < padding.left || x > width - padding.right + 2) return null
            return (
              <text key={val} className="scatter-chart__axis" x={x} y={height - 25} textAnchor="middle">
                {val === 0 ? '0' : val >= 10000 ? `${val / 10000}萬` : val.toLocaleString()}
              </text>
            )
          })
        })()}

        {/* Base markers first */}
        {points.map((p) => {
          const r = toR(p.size)
          const isActive = p.id === activePointId
          return (
            <circle
              key={p.id}
              className={`${isActive ? 'scatter-chart__point scatter-chart__point--active' : 'scatter-chart__point'} chart-data-focusable`}
              cx={toX(p.x)}
              cy={toY(p.y)}
              r={isActive ? r + 4 : r}
              tabIndex={0}
              role="button"
              onMouseEnter={() => onHoverPoint?.(p.id)}
              onMouseLeave={() => { if (activePointId === p.id) onHoverPoint?.(null) }}
              onClick={() => onSelectPoint?.(p.id)}
              onFocus={() => onHoverPoint?.(p.id)}
              onBlur={() => { if (activePointId === p.id) onHoverPoint?.(null) }}
            />
          )
        })}

        {/* Floating Tooltip Layer - Render on top of everything to prevent event dead-zones */}
        {(() => {
          const activePoint = points.find(p => p.id === activePointId)
          if (!activePoint) return null
          
          const r = toR(activePoint.size)
          const px = toX(activePoint.x)
          const py = toY(activePoint.y)
          
          const tooltipWidth = 92
          const tooltipHeight = 22
          // Unify clamping logic to prevent label and box from decoupling
          const tooltipX = Math.min(Math.max(px - tooltipWidth / 2, padding.left + 4), width - padding.right - tooltipWidth - 4)
          const tooltipY = Math.max(py - r - 28, padding.top + 4)

          return (
            <g className="chart-svg-tooltip__group" style={{ pointerEvents: 'none' }}>
              <rect 
                className="chart-svg-tooltip__surface" 
                x={tooltipX} 
                y={tooltipY} 
                width={tooltipWidth} 
                height={tooltipHeight} 
                rx="6" 
              />
              <text 
                className="chart-svg-tooltip__title" 
                x={tooltipX + tooltipWidth / 2} 
                y={tooltipY + 14} 
                textAnchor="middle"
              >
                {activePoint.label}
              </text>
            </g>
          )
        })()}

        <text className="scatter-chart__axis-title" x={width / 2} y={height - 5} textAnchor="middle">{xLabel}</text>
        <text className="scatter-chart__axis-title" transform={"translate(15 " + (height / 2) + ") rotate(-90)"} textAnchor="middle">{yLabel}</text>

      </svg>
      </div>
    </div>
  </section>
)
}

export default ScatterPlotChart
