import { useChartAnimation } from '../../hooks/useChartAnimation'
import { useResponsiveSvg } from '../../hooks/useResponsiveSvg'

type RadarDimension = {
  key: string
  label: string
  value: number // Normalized 0-1
  benchmarkValue?: number // 規格標準
  displayValue: string
  color?: string
}

type RadarChartProps = {
  title: string
  subtitle?: string
  dimensions: RadarDimension[]
  className?: string
  flat?: boolean
  showHeader?: boolean
  benchmarkLabel?: string
}

const DEFAULT_COLORS = [
  '#38bdf8', // Blue
  '#fbbf24', // Amber
  '#f472b6', // Pink
  '#c084fc', // Purple
  '#4ade80', // Green
  '#f87171', // Red
]

/**
 * Nightingale Rose Chart (Polar Area Chart)
 * 提供更強烈的視覺衝擊力，並保留診斷對照功能
 */
export function RadarChart({
  title,
  subtitle,
  dimensions,
  className,
  flat,
  showHeader = true,
  benchmarkLabel = '全區平均',
 }: RadarChartProps) {
  const { containerRef, width, height } = useResponsiveSvg(400, 280, { minWidth: 260 })
  const { ref, isVisible } = useChartAnimation()
  
  const centerX = width / 2
  const centerY = height / 2 - 8 // Shifted slightly up to leave room for bottom labels/legend
  const maxRadius = Math.min(centerX, centerY) * 0.55 
  const innerRadius = 12 
  
  const combinedClasses = [
    'dashboard-card',
    'nightingale-chart',
    flat ? 'dashboard-card--flat' : '',
    isVisible ? 'chart-enter chart-enter--visible' : 'chart-enter',
    className || ''
  ].filter(Boolean).join(' ')

  if (dimensions.length === 0) return null

  const angleStep = (Math.PI * 2) / dimensions.length

  const getArcPath = (index: number, value: number) => {
    const startAngle = index * angleStep - Math.PI / 2
    const endAngle = (index + 1) * angleStep - Math.PI / 2
    const r = innerRadius + (maxRadius - innerRadius) * value
    
    const x1 = centerX + Math.cos(startAngle) * r
    const y1 = centerY + Math.sin(startAngle) * r
    const x2 = centerX + Math.cos(endAngle) * r
    const y2 = centerY + Math.sin(endAngle) * r
    
    const ix1 = centerX + Math.cos(startAngle) * innerRadius
    const iy1 = centerY + Math.sin(startAngle) * innerRadius
    const ix2 = centerX + Math.cos(endAngle) * innerRadius
    const iy2 = centerY + Math.sin(endAngle) * innerRadius

    return `
      M ${ix1} ${iy1}
      L ${x1} ${y1}
      A ${r} ${r} 0 0 1 ${x2} ${y2}
      L ${ix2} ${iy2}
      A ${innerRadius} ${innerRadius} 0 0 0 ${ix1} ${iy1}
      Z
    `
  }

  // Grid Rings
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0]

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
      
      <div className="dashboard-card__body" style={{ padding: '0px' }}>
        <div className="chart-svg-frame" ref={containerRef}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Grid Rings */}
            {gridLevels.map((lvl) => (
               <circle
                 key={lvl}
                 cx={centerX}
                 cy={centerY}
                 r={innerRadius + (maxRadius - innerRadius) * lvl}
                 fill="none"
                 stroke="rgba(0,0,0,0.05)"
                 strokeWidth="1"
               />
            ))}
            
            {/* Axis Labels & Lines */}
            {dimensions.map((d, i) => {
              const startAngle = i * angleStep - Math.PI / 2
              const midAngle = (i + 0.5) * angleStep - Math.PI / 2
              const labelRadius = maxRadius + 14 // Closest possible
              const lx = centerX + Math.cos(midAngle) * labelRadius
              const ly = centerY + Math.sin(midAngle) * labelRadius
              
              const isRight = Math.cos(midAngle) > 0.1
              const isLeft = Math.cos(midAngle) < -0.1
              const textAnchor = isRight ? 'start' : (isLeft ? 'end' : 'middle')

              return (
                <g key={d.key}>
                  <line 
                    x1={centerX + Math.cos(startAngle) * innerRadius} 
                    y1={centerY + Math.sin(startAngle) * innerRadius} 
                    x2={centerX + Math.cos(startAngle) * maxRadius} 
                    y2={centerY + Math.sin(startAngle) * maxRadius} 
                    stroke="rgba(0,0,0,0.06)" 
                  />
                  <text
                    x={lx}
                    y={ly - 4}
                    textAnchor={textAnchor}
                    fontSize="10"
                    fontWeight="700"
                    fill="#64748b"
                  >
                    {d.label}
                  </text>
                  <text
                    x={lx}
                    y={ly + 8}
                    textAnchor={textAnchor}
                    fontSize="9"
                    fontWeight="900"
                    fill={d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                  >
                    {d.displayValue}
                  </text>
                </g>
              )
            })}
            
            {/* Benchmark Arc (The "Standard") */}
            {dimensions.map((d, i) => {
               if (d.benchmarkValue === undefined) return null
               const startAngle = i * angleStep - Math.PI / 2
               const endAngle = (i + 1) * angleStep - Math.PI / 2
               const r = innerRadius + (maxRadius - innerRadius) * d.benchmarkValue
               
               const x1 = centerX + Math.cos(startAngle) * r
               const y1 = centerY + Math.sin(startAngle) * r
               const x2 = centerX + Math.cos(endAngle) * r
               const y2 = centerY + Math.sin(endAngle) * r
               
               return (
                 <path
                   key={`bench-${d.key}`}
                   d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
                   fill="none"
                   stroke="rgba(0,0,0,0.2)"
                   strokeWidth="2"
                   strokeDasharray="4 2"
                 />
               )
            })}

            {/* Nightingale Petals (Data) */}
            {dimensions.map((d, i) => {
              const color = d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]
              return (
                <path
                  key={d.key}
                  d={getArcPath(i, isVisible ? d.value : 0)}
                  fill={color}
                  fillOpacity="0.7"
                  stroke={color}
                  strokeWidth="0.5"
                  style={{ 
                    transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                />
              )
            })}

            {/* Center Core */}
            <circle
              cx={centerX}
              cy={centerY}
              r={innerRadius}
              fill="#fff"
              stroke="rgba(0,0,0,0.05)"
              strokeWidth="1"
            />
          </svg>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', padding: '12px 0 20px', fontSize: '11px', fontWeight: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
            <span style={{ width: '12px', height: '12px', background: '#38bdf8', opacity: 0.8, borderRadius: '3px' }}></span>
            本校診斷數據
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
            <span style={{ width: '12px', height: '0', borderBottom: '2px dashed currentColor' }}></span>
            {benchmarkLabel} (規格線)
          </div>
        </div>
      </div>
    </section>
  )
}

export default RadarChart
