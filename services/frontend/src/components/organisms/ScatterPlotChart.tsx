import React, { useMemo } from 'react'
import { useChartAnimation } from '../../hooks/useChartAnimation'
import { useResponsiveSvg } from '../../hooks/useResponsiveSvg'
import '../../styles/data/charts/01-matrix-chart-redesign.css'

/**
 * Atomic Design: ScatterPlotChart (Organism)
 * 重新建構：穩定座標系、原子化結構、無閃爍交互
 */

type ScatterPoint = {
  id: string
  label: string
  x: number
  y: number
  size?: number
}

type ScatterPlotChartProps = {
  title: string
  subtitle?: string | React.ReactNode
  xLabel: string
  yLabel: string
  points: ScatterPoint[]
  activePointId?: string | null
  onHoverPoint?: (id: string | null) => void
  onSelectPoint?: (id: string) => void
  className?: string
  flat?: boolean
  showHeader?: boolean
}

const DEFAULT_PADDING = { top: 20, right: 30, bottom: 50, left: 70 }

export const ScatterPlotChart: React.FC<ScatterPlotChartProps> = ({
  title,
  subtitle,
  xLabel,
  yLabel,
  points,
  activePointId = null,
  onHoverPoint,
  onSelectPoint,
  className = '',
  flat = true,
  showHeader = true,
}) => {
  const { ref: animRef } = useChartAnimation()
  const responsiveOptions = useMemo(() => ({ minWidth: 320 }), [])
  const { containerRef, width, height } = useResponsiveSvg(620, 320, responsiveOptions)
  
  const padding = useMemo(() => ({
    ...DEFAULT_PADDING,
    left: width < 450 ? 55 : 70,
    right: width < 450 ? 15 : 30
  }), [width])

  // 1. 軸線範圍計算 (穩定化)
  const { maxX, minY, maxY, midXVal, rangeX, rangeY } = useMemo(() => {
    if (points.length === 0) return { maxX: 100, minY: -1, maxY: 1, midXVal: 50, rangeX: 100, rangeY: 2 }

    const xs = points.map(p => p.x)
    const ys = points.map(p => p.y)
    
    // X軸：固定從 0 開始，並向上取整到穩定的間距
    const rawMaxX = Math.max(...xs, 10)
    const snapX = rawMaxX > 10000 ? 5000 : rawMaxX > 1000 ? 1000 : 500
    const calcMaxX = Math.ceil((rawMaxX * 1.15) / snapX) * snapX
    
    // Y軸：不再強制對稱，改為獨立根據最大/最小值動態調整
    const rawMaxY = ys.length > 0 ? Math.max(...ys, 0.02) : 0.05
    const rawMinY = ys.length > 0 ? Math.min(...ys, -0.02) : -0.05
    
    // 設置 Y 軸範圍，向上/下延伸 20% 的餘裕空間，並確保包含 0 軸
    const maxYVal = Math.max(rawMaxY * (rawMaxY > 0 ? 1.2 : 0.8), 0.05)
    const minYVal = Math.min(rawMinY * (rawMinY < 0 ? 1.2 : 0.8), -0.05)
    
    // 中間分割線取 X 範圍的中值
    const calcMidXVal = calcMaxX / 2

    return {
      minX: 0,
      maxX: calcMaxX,
      minY: minYVal,
      maxY: maxYVal,
      midXVal: calcMidXVal,
      rangeX: calcMaxX,
      rangeY: maxYVal - minYVal
    }
  }, [points])

  // 2. 座標轉換函式 (加上邊界箝制 Clamp，避免離群值飛出圖表)
  const toX = (v: number) => {
    const pos = padding.left + (v / rangeX) * (width - padding.left - padding.right)
    return Math.min(Math.max(pos, padding.left), width - padding.right)
  }
  const toY = (v: number) => {
    const ratio = (v - minY) / rangeY
    const pos = height - padding.bottom - ratio * (height - padding.top - padding.bottom)
    // 為了解決離群值問題，將超出範圍的點箝制在邊緣 (加上 2px 緩衝)
    return Math.min(Math.max(pos, padding.top + 2), height - padding.bottom - 2)
  }
  
  const midXPos = toX(midXVal)
  const midYPos = toY(0)

  const maxSize = useMemo(() => Math.max(...points.map(p => p.size ?? 10), 10), [points])
  const toR = (s?: number) => 4 + ((s ?? 10) / maxSize) * 8

  // 3. 處理無資料狀態
  if (points.length === 0) {
    return (
      <section className={`dashboard-card scatter-chart ${flat ? 'dashboard-card--flat' : ''} ${className}`} ref={animRef as React.RefObject<HTMLElement>}>
        {showHeader && (
          <div className="dashboard-card__head">
            <h3 className="dashboard-card__title">{title}</h3>
          </div>
        )}
        <div className="dashboard-card__body">
          <div className="chart-empty-state">尚無資料</div>
        </div>
      </section>
    )
  }

  return (
    <section 
      className={`dashboard-card scatter-chart ${flat ? 'dashboard-card--flat' : ''} ${className}`} 
      ref={animRef as React.RefObject<HTMLElement>}
      style={{ overflow: 'visible' }}
    >
      {showHeader && (
        <div className="dashboard-card__head">
          <div className="panel-heading__stack">
            <h3 className="dashboard-card__title">{title}</h3>
            {subtitle && (typeof subtitle === 'string' ? <p className="dashboard-card__subtitle">{subtitle}</p> : subtitle)}
          </div>
        </div>
      )}

      <div className="dashboard-card__body" style={{ position: 'relative' }}>
        <div className="chart-svg-frame" ref={containerRef}>
          <svg 
            className="scatter-chart__svg" 
            viewBox={`0 0 ${width} ${height}`}
            style={{ overflow: 'visible' }}
          >
            {/* --- 背景四象限 --- */}
            <g className="scatter-chart__background">
               {/* Rounding these prevents sub-pixel jitter during layout shifts */}
               {(() => {
                 const mXP = Math.round(midXPos)
                 const mYP = Math.round(midYPos)
                 return (
                   <g className="scatter-chart__quadrants-stable">
                     <rect x={padding.left} y={padding.top} width={mXP - padding.left} height={mYP - padding.top} className="scatter-chart__quadrant scatter-chart__quadrant--tl" />
                     <rect x={mXP} y={padding.top} width={width - padding.right - mXP} height={mYP - padding.top} className="scatter-chart__quadrant scatter-chart__quadrant--tr" />
                     <rect x={padding.left} y={mYP} width={mXP - padding.left} height={height - padding.bottom - mYP} className="scatter-chart__quadrant scatter-chart__quadrant--bl" />
                     <rect x={mXP} y={mYP} width={width - padding.right - mXP} height={height - padding.bottom - mYP} className="scatter-chart__quadrant scatter-chart__quadrant--br" />
                   </g>
                 )
               })()}
            </g>

            {/* --- 軸線與標籤 --- */}
            <g className="scatter-chart__lines">
              <line x1={midXPos} x2={midXPos} y1={padding.top} y2={height - padding.bottom} className="scatter-chart__zero" />
              <line x1={padding.left} x2={width - padding.right} y1={midYPos} y2={midYPos} className="scatter-chart__zero" />
            </g>

            <g className="scatter-chart__quadrant-labels" style={{ pointerEvents: 'none', opacity: 0.5 }}>
              <text x={padding.left + 10} y={padding.top + 20} className="scatter-chart__quadrant-label">新興熱點</text>
              <text x={width - padding.right - 10} y={padding.top + 20} textAnchor="end" className="scatter-chart__quadrant-label">領先成長</text>
              <text x={padding.left + 10} y={height - padding.bottom - 10} className="scatter-chart__quadrant-label">縮減警戒</text>
              <text x={width - padding.right - 10} y={height - padding.bottom - 10} textAnchor="end" className="scatter-chart__quadrant-label">主要規模</text>
            </g>

            {/* --- Y 軸刻度 --- */}
            <g className="scatter-chart__axis-y">
                {[minY, 0, maxY].map(val => {
                  const y = toY(val)
                  const label = Math.abs(val) < 0.001 ? '0%' : (val > 0 ? '+' : '') + (Number.isInteger(val) ? val : parseFloat(val.toFixed(2))) + '%'
                  return (
                    <text key={val} x={padding.left - 12} y={y + 4} textAnchor="end" className="scatter-chart__axis">
                      {label}
                    </text>
                  )
                })}
            </g>

            {/* --- X 軸刻度 --- */}
            <g className="scatter-chart__axis-x">
               {[0, maxX / 2, maxX].map(val => {
                 const x = toX(val)
                 const label = val === 0 ? '0' : val >= 10000 ? `${val/10000}萬` : val.toLocaleString()
                 return (
                   <text key={val} x={x} y={height - 25} textAnchor="middle" className="scatter-chart__axis">
                     {label}
                   </text>
                 )
               })}
            </g>

            {/* --- 數據點 --- */}
            <g className="scatter-chart__points">
              {points.map(p => {
                const cx = toX(p.x)
                const cy = toY(p.y)
                const r = toR(p.size)
                const isHovered = p.id === activePointId

                return (
                  <g key={p.id}>
                    {/* 透明交互層：穩定且較大，防止滑鼠逃脫導致的閃爍 */}
                    <circle 
                      cx={cx} cy={cy} r={r + 10} 
                      fill="transparent" 
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => onHoverPoint?.(p.id)}
                      onMouseLeave={() => onHoverPoint?.(null)}
                      onClick={() => onSelectPoint?.(p.id)}
                    />
                    {/* 視覺圓點：始終渲染，確保佈局穩定 */}
                    <circle 
                      cx={cx} cy={cy} r={r}
                      className={isHovered ? 'scatter-chart__point scatter-chart__point--hovered-base' : 'scatter-chart__point'}
                      style={{ pointerEvents: 'none' }}
                    />
                  </g>
                )
              })}
            </g>

            {/* --- 單獨的 Highlight 層：確保選中點在最上方 --- */}
            {(() => {
              const activePoint = points.find(p => p.id === activePointId)
              if (!activePoint) return null
              const cx = toX(activePoint.x)
              const cy = toY(activePoint.y)
              const r = toR(activePoint.size)
              return (
                <circle 
                  cx={cx} cy={cy} r={r + 2}
                  className="scatter-chart__point scatter-chart__point--active"
                  style={{ pointerEvents: 'none', filter: 'drop-shadow(0 0 12px var(--clr-accent-amber))' }}
                />
              )
            })()}

            {/* --- 單獨的 Tooltip 層 (確保在最上方) --- */}
            {(() => {
              const activePoint = points.find(p => p.id === activePointId)
              if (!activePoint) return null
              const tx = toX(activePoint.x)
              const ty = toY(activePoint.y)
              const r = toR(activePoint.size)
              
              const boxW = 110
              const boxH = 28
              const safeX = Math.min(Math.max(tx - boxW/2, padding.left + 5), width - padding.right - boxW - 5)
              const safeY = Math.max(ty - r - 35, padding.top + 5)

              return (
                <g className="chart-svg-tooltip__group" style={{ pointerEvents: 'none' }}>
                  <rect x={safeX} y={safeY} width={boxW} height={boxH} rx="8" className="chart-svg-tooltip__surface" />
                  <text x={safeX + boxW/2} y={safeY + 18} textAnchor="middle" className="chart-svg-tooltip__title">
                    {activePoint.label}
                  </text>
                </g>
              )
            })()}

            {/* --- 軸標題 --- */}
            <text x={width/2} y={height - 5} textAnchor="middle" className="scatter-chart__axis-title">{xLabel}</text>
            <text transform={`translate(15, ${height/2}) rotate(-90)`} textAnchor="middle" className="scatter-chart__axis-title">{yLabel}</text>
          </svg>
        </div>
      </div>
    </section>
  )
}

export default ScatterPlotChart
