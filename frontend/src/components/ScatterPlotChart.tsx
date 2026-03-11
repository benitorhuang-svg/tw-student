
import { useChartAnimation } from '../hooks/useChartAnimation'
import { useResponsiveSvg } from '../hooks/useResponsiveSvg'

const formatWan = (val: number) => {
  if (val === 0) return '0'
  const absoluteVal = Math.abs(val)
  if (absoluteVal < 1000) return val.toLocaleString('zh-TW')
  return `${+(val / 10000).toFixed(1)} 萬`
}

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
  subtitle: string
  xLabel: string
  yLabel: string
  points: ScatterPoint[]
  activePointId?: string | null
  formatX?: (value: number) => string
  formatY?: (value: number) => string
  onHoverPoint?: (id: string | null) => void
  onSelectPoint?: (id: string) => void
  children?: React.ReactNode
}

function ScatterPlotChart({
  title, subtitle, xLabel, yLabel, points, activePointId = null,
  formatX = (value) => `${formatWan(Math.round(value))}人`,
  formatY = (value) => {
    if (value === 0) return '0%'
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  },
  onHoverPoint, onSelectPoint,
  children,
}: ScatterPlotChartProps) {
  const { ref: animRef, isVisible } = useChartAnimation()
  const { containerRef, width, height } = useResponsiveSvg(620, 240, { minWidth: 320 })
  const padding = { top: 20, right: 50, bottom: 40, left: 100 }
  
  if (points.length === 0) {
    return (
      <section className="scatter-chart" style={{ padding: '12px 14px' }}>
        <div className="panel-heading" style={{ marginBottom: '10px', paddingLeft: '4px' }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
        </div>
        <div className="chart-empty-state">尚無資料</div>
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
    <section className="scatter-chart" ref={animRef as React.RefObject<HTMLElement>} style={{ padding: '12px 14px' }}>
      <div className="panel-heading" style={{ marginBottom: '10px', paddingLeft: '4px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {children}
        </div>
        <p className="panel-heading__meta" style={{ margin: 0, opacity: 0.7, lineHeight: 1.4, maxWidth: '400px' }}>
          {subtitle}
        </p>
      </div>

  <div className="chart-svg-frame" ref={containerRef}>
  <svg className={`scatter-chart__svg${isVisible ? ' chart-enter chart-enter--visible' : ' chart-enter'}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${title} 散佈圖`}>
        {/* 四象限淡色背景 */}
        <rect x={padding.left} y={padding.top} width={midX - padding.left} height={midY - padding.top} fill="var(--chart-quadrant-tl)" rx="2" />
        <rect x={midX} y={padding.top} width={width - padding.right - midX} height={midY - padding.top} fill="var(--chart-quadrant-tr)" rx="2" />
        <rect x={padding.left} y={midY} width={midX - padding.left} height={height - padding.bottom - midY} fill="var(--chart-quadrant-bl)" rx="2" />
        <rect x={midX} y={midY} width={width - padding.right - midX} height={height - padding.bottom - midY} fill="var(--chart-quadrant-br)" rx="2" />

        {/* 四象限格線 */}
        <line className="scatter-chart__zero" x1={midX} x2={midX} y1={padding.top} y2={height - padding.bottom} />
        <line className="scatter-chart__zero" x1={padding.left} x2={width - padding.right} y1={midY} y2={midY} />

        {/* 十字線數值標註 */}
        <text className="scatter-chart__axis" x={midX} y={padding.top - 6} textAnchor="middle" fill="var(--palette-cyan)" fontSize="10" fontWeight="bold">
          平均: {formatX(avgX)}
        </text>
        <text className="scatter-chart__axis" x={width - padding.right + 5} y={midY + 4} fill="var(--palette-brass)" fontSize="10" fontWeight="bold">
          {formatY(0)}
        </text>

        {/* 象限標籤 */}
        <text className="scatter-chart__quadrant-label" x={width - padding.right - 5} y={padding.top + 15} textAnchor="end">潛力成長</text>
        <text className="scatter-chart__quadrant-label" x={padding.left + 5} y={padding.top + 15}>快速擴張</text>
        <text className="scatter-chart__quadrant-label" x={padding.left + 5} y={height - padding.bottom - 10}>轉型警示</text>
        <text className="scatter-chart__quadrant-label" x={width - padding.right - 5} y={height - padding.bottom - 10} textAnchor="end">穩定飽和</text>

        {/* 座標軸線與標註 */}
        {(() => {
          const ticks = []
          const start = Math.floor(minY / 0.5) * 0.5
          const end = Math.ceil(maxY / 0.5) * 0.5
          for (let v = start; v <= end + 0.01; v += 0.5) {
            ticks.push(Math.round(v * 10) / 10)
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
        {(() => {
          const ticks = []
          for (let v = 0; v <= maxX + 1; v += 50000) {
            ticks.push(v)
          }
          return ticks.map((val) => {
            const x = toX(val)
            if (x < padding.left || x > width - padding.right + 2) return null
            return (
              <text key={val} className="scatter-chart__axis" x={x} y={height - 25} textAnchor="middle">
                {val === 0 ? '0' : val / 10000}
              </text>
            )
          })
        })()}

        {points.map((p) => {
          const r = toR(p.size)
          const active = p.id === activePointId
          return (
            <g key={p.id}>
              <circle
                className={active ? 'scatter-chart__point scatter-chart__point--active chart-data-focusable' : 'scatter-chart__point chart-data-focusable'}
                cx={toX(p.x)} cy={toY(p.y)} r={active ? r + 2 : r}
                tabIndex={0}
                role="listitem"
                aria-label={`${p.label}: ${formatX(p.x)}, ${formatY(p.y)}`}
                onMouseEnter={() => onHoverPoint?.(p.id)}
                onMouseLeave={() => onHoverPoint?.(null)}
                onClick={() => onSelectPoint?.(p.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectPoint?.(p.id) } }}
                onFocus={() => onHoverPoint?.(p.id)}
                onBlur={() => onHoverPoint?.(null)}
              />
              {active && (
                <g style={{ pointerEvents: 'none' }}>
                  <rect className="chart-svg-tooltip__surface" x={toX(p.x) - 40} y={toY(p.y) - r - 25} width="80" height="20" rx="6" />
                  <text className="chart-svg-tooltip__title" x={toX(p.x)} y={toY(p.y) - r - 12} textAnchor="middle">{p.label}</text>
                </g>
              )}
            </g>
          )
        })}

        <text className="scatter-chart__axis-title" x={width / 2} y={height - 5} textAnchor="middle" fontSize="11">{xLabel}</text>
        <text className="scatter-chart__axis-title" transform={`translate(15 ${height / 2}) rotate(-90)`} textAnchor="middle" fontSize="11">{yLabel}</text>

      </svg>
      </div>
    </section>
  )
}

export default ScatterPlotChart
