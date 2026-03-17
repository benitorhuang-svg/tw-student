import { useChartAnimation } from '../../hooks/useChartAnimation'
import { useResponsiveSvg } from '../../hooks/useResponsiveSvg'
import '../../styles/data/charts/01-matrix-chart-redesign.css'

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
  subtitle?: string | React.ReactNode
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

export function ScatterPlotChart({
  title, subtitle, xLabel, yLabel, points, activePointId = null,
  formatY = (value) => {
    if (value === 0) return '0%'
    const formatted = Math.abs(value) % 1 === 0 ? Math.abs(value).toString() : Math.abs(value).toFixed(1)
    return `${value > 0 ? '+' : '-'}${formatted}%`
  },
  onHoverPoint, onSelectPoint,
  children,
  className, flat, showHeader = true,
}: ScatterPlotChartProps) {
  const { ref: animRef, isVisible } = useChartAnimation()
  const { containerRef, width, height } = useResponsiveSvg(620, 340, { minWidth: 320 })
  const padding = { top: 8, right: width < 400 ? 16 : 20, bottom: 40, left: width < 400 ? 56 : 80 }
  
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
              {subtitle && (typeof subtitle === 'string' ? <p className="dashboard-card__subtitle">{subtitle}</p> : subtitle)}
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

  // --- DYNAMIC SYMMETRIC Y-AXIS LOGIC ---
  const absMaxY = Math.max(...valuesY.map(y => Math.abs(y)), 0)
  
  // Snap to levels: 0.5, 1, 2, 4, 6, 8, 10...
  let snapLimit = 0.5
  if (absMaxY > 6) snapLimit = Math.ceil(absMaxY / 2) * 2
  else if (absMaxY > 2) snapLimit = Math.ceil(absMaxY) % 2 === 0 ? Math.ceil(absMaxY) : Math.ceil(absMaxY) + 1
  else if (absMaxY > 1) snapLimit = 2
  else if (absMaxY > 0.5) snapLimit = 1
  
  const minY = -snapLimit
  const maxY = snapLimit

  const minX = 0
  const rawMaxX = Math.max(...valuesX, 0)
  const maxX = Math.max(rawMaxX * 1.15, 10)

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
            {title && <h3 className="dashboard-card__title">{title}</h3>}
            {subtitle && (typeof subtitle === 'string' ? <p className="dashboard-card__subtitle">{subtitle}</p> : subtitle)}
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

        {/* 四象限標籤 */}
        <text className="scatter-chart__quadrant-label" x={padding.left + 8} y={padding.top + 16} textAnchor="start">新興熱點</text>
        <text className="scatter-chart__quadrant-label" x={width - padding.right - 8} y={padding.top + 16} textAnchor="end">領先成長</text>
        <text className="scatter-chart__quadrant-label" x={padding.left + 8} y={height - padding.bottom - 8} textAnchor="start">縮減警戒</text>
        <text className="scatter-chart__quadrant-label" x={width - padding.right - 8} y={height - padding.bottom - 8} textAnchor="end">主要規模</text>

        {/* 座標軸線與標註 */}
        {(() => {
          const tickCount = 6 // Slightly fewer for clean look
          const rawStep = rangeY / tickCount
          
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
             const rounded = Math.round(v * 1000) / 1000
             if (rounded === 0) continue // Zero is handled by quadrant lines
             ticks.push(rounded)
          }

          return ticks.map((val) => {
            const y = toY(val)
            if (y < padding.top + 10 || y > height - padding.bottom - 10) return null
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

        {/* Base markers - Stable order to prevent DOM reshuffling flicker */}
        {points.map((p) => {
          const r = toR(p.size)
          const isActive = p.id === activePointId
          return (
            <circle
              key={p.id}
              className={`${isActive ? 'scatter-chart__point scatter-chart__point--active' : 'scatter-chart__point'} chart-data-focusable`}
              cx={toX(p.x)}
              cy={toY(p.y)}
              r={isActive ? r + 1.5 : r} 
              tabIndex={0}
              role="button"
              onMouseEnter={() => {
                // Use a simple event check to stabilize
                onHoverPoint?.(p.id)
              }}
              onMouseLeave={() => { if (activePointId === p.id) onHoverPoint?.(null) }}
              onClick={() => onSelectPoint?.(p.id)}
              onFocus={() => onHoverPoint?.(p.id)}
              onBlur={() => { if (activePointId === p.id) onHoverPoint?.(null) }}
            />
          )
        })}

        {/* Top-most Highlight Layer: Render a clone of the active point on top without moving the original DOM node */}
        {(() => {
          const activePoint = points.find(p => p.id === activePointId)
          if (!activePoint) return null
          const r = toR(activePoint.size)
          return (
            <circle
              className="scatter-chart__point--active-overlay"
              cx={toX(activePoint.x)}
              cy={toY(activePoint.y)}
              r={r + 1.5}
              style={{ pointerEvents: 'none' }} // Crucial: don't intercept events from the real point below
            />
          )
        })()}

        {/* Floating Tooltip Layer - Render on top of everything to prevent event dead-zones */}
        {(() => {
          const activePoint = points.find(p => p.id === activePointId)
          if (!activePoint) return null
          
          const r = toR(activePoint.size)
          const px = toX(activePoint.x)
          const py = toY(activePoint.y)
          
          const tooltipWidth = 100
          const tooltipHeight = 26
          // Unify clamping logic to prevent label and box from decoupling
          const tooltipX = Math.min(Math.max(px - tooltipWidth / 2, padding.left + 4), width - padding.right - tooltipWidth - 4)
          const tooltipY = Math.max(py - r - 32, padding.top + 4)

          return (
            <g className="chart-svg-tooltip__group" style={{ pointerEvents: 'none', transition: 'all 0.3s ease' }}>
              <rect 
                className="chart-svg-tooltip__surface" 
                x={tooltipX} 
                y={tooltipY} 
                width={tooltipWidth} 
                height={tooltipHeight} 
                rx="8" 
              />
              <text 
                className="chart-svg-tooltip__title" 
                x={tooltipX + tooltipWidth / 2} 
                y={tooltipY + 17} 
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
