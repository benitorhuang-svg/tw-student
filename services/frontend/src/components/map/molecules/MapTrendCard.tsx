import React, { useMemo } from 'react'
import type { AcademicYear } from '../../../data/educationData'

type TrendPoint = {
  year: AcademicYear
  value: number
}

type MapTrendCardProps = {
  trend: TrendPoint[]
  activeYear: AcademicYear
  label: string
  level: string
}

const formatValue = (val: number): string => {
  if (val >= 10000) {
    return `${(val / 10000).toFixed(1)}萬`
  }
  return val.toLocaleString()
}

export const MapTrendCard = ({ trend, activeYear, label, level }: MapTrendCardProps) => {
  const { data, minVal, maxVal } = useMemo(() => {
    const recentTrend = trend.slice(-7)
    if (recentTrend.length === 0) return { data: [], minVal: 0, maxVal: 0 }
    
    const values = recentTrend.map(t => t.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min
    const padding = range === 0 ? min * 0.1 : range * 0.2
    
    const processed = recentTrend.map((point) => {
      const originalIndex = trend.findIndex(t => t.year === point.year)
      const prev = originalIndex > 0 ? trend[originalIndex - 1] : null
      const delta = prev ? point.value - prev.value : 0
      const deltaRatio = prev && prev.value !== 0 ? delta / prev.value : 0
      
      return {
        ...point,
        delta,
        deltaRatio: deltaRatio * 100,
      }
    })

    return { 
      data: processed, 
      minVal: min - padding, 
      maxVal: max + padding 
    }
  }, [trend])

  if (data.length === 0) return null

  const chartH = 55 
  const chartW = 260
  const getX = (idx: number) => (idx / (data.length - 1)) * chartW
  const getY = (val: number) => chartH - ((val - minVal) / (maxVal - minVal)) * chartH

  return (
    <div className="map-trend-card">
      <div className="map-trend-card__header">
        <div className="map-trend-card__title">
          年度趨勢 ( {label} )
        </div>
      </div>
      <div className="map-trend-card__body">
        <div className="map-trend-card__chart-container">
          {/* Main SVG Chart - Final Precision Layout */}
          <svg viewBox={`-10 -5 ${chartW + 20} ${chartH + 35}`} className="map-trend-card__svg" preserveAspectRatio="none">
            {/* 1. Draw segments */}
            {data.map((item, i) => {
              if (i === 0) return null
              const prev = data[i - 1]
              return (
                <line
                  key={`line-${item.year}`}
                  x1={getX(i - 1)}
                  y1={getY(prev.value)}
                  x2={getX(i)}
                  y2={getY(item.value)}
                  stroke={item.delta < 0 ? "#ef4444" : "var(--brand-primary)"}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )
            })}
            
            {/* 2. Nodes and Labels */}
            {data.map((item, i) => {
              const x = getX(i)
              const y = getY(item.value)
              
              return (
                <g key={`group-${item.year}`}>
                  {/* Percentage ABOVE node */}
                  <text
                    x={x}
                    y={y - 12}
                    textAnchor="middle"
                    fontSize="7"
                    fontWeight="800"
                    fill={item.delta > 0 ? "#0d9488" : item.delta < 0 ? "#e11d48" : "#94a3b8"}
                  >
                    {item.delta !== 0 ? `${item.delta > 0 ? '+' : ''}${item.deltaRatio.toFixed(item.deltaRatio >= 10 ? 0 : 1)}%` : '-'}
                  </text>

                  {/* Node circle */}
                  <circle
                    cx={x}
                    cy={y}
                    r={item.year === activeYear ? "3.5" : "2.5"}
                    fill={item.year === activeYear ? (item.delta < 0 ? "#ef4444" : "var(--brand-primary)") : "#fff"}
                    stroke={item.delta < 0 ? "#ef4444" : "var(--brand-primary)"}
                    strokeWidth="1.2"
                  />

                  {/* Population value BELOW node */}
                  <text
                    x={x}
                    y={y + 15}
                    textAnchor="middle"
                    fontSize="6.5"
                    fontWeight="800"
                    fill="#1e293b"
                  >
                    {formatValue(item.value)}
                  </text>

                  {/* Year label AT BOTTOM */}
                  <text
                    x={x}
                    y={chartH + 30}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight={item.year === activeYear ? "900" : "700"}
                    fill={item.year === activeYear ? "var(--brand-primary)" : "#64748b"}
                  >
                    {item.year.toString().slice(-3)}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>
    </div>
  )
}

export default MapTrendCard
