import React from 'react'
import AnimatedNumber from '../AnimatedNumber'

type StatCardProps = {
  label: string
  value: string | number
  unit?: string
  numericValue?: number
  tone?: 'lagoon' | 'sun' | 'coral'
  trend?: {
    value: number | string
    isPositive: boolean
  }
  meta?: string
  icon?: React.ReactNode
  sparklineData?: number[]
  gauge?: number // 0 to 1
  className?: string
}

/**
 * Atom: StatCard
 * 用於顯示核心指標的大數字卡片
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  numericValue,
  tone,
  trend,
  meta,
  icon,
  sparklineData,
  gauge,
  className = ''
}) => {
  const finalClassName = [
    'stat-card',
    tone ? `stat-card--${tone}` : '',
    className
  ].filter(Boolean).join(' ')

  return (
    <article className={finalClassName}>
      <header className="stat-card__header">
        <span className="stat-card__label">{label}</span>
        {icon && <span className="stat-card__icon">{icon}</span>}
      </header>
      <main className="stat-card__content">
        <div className="stat-card__value-group">
          <span className="stat-card__value">
            {numericValue !== undefined ? (
              <AnimatedNumber value={numericValue} />
            ) : (
              value
            )}
          </span>
          {unit && <span className="stat-card__unit">{unit}</span>}
        </div>
        {sparklineData && sparklineData.length > 1 && (
          <div className="stat-card__sparkline">
            <svg viewBox="0 0 60 20" preserveAspectRatio="none">
              {(() => {
                const min = Math.min(...sparklineData)
                const max = Math.max(...sparklineData)
                const range = max - min || 1
                const points = sparklineData.map((d, i) => ({
                  x: (i / (sparklineData.length - 1)) * 60,
                  y: 20 - ((d - min) / range) * 18 - 1
                }))
                const d = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
                return (
                  <path 
                    d={d} 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                  />
                )
              })()}
            </svg>
          </div>
        )}
      </main>
      {gauge !== undefined && (
        <div className="stat-card__gauge">
          <div className="stat-card__gauge-fill" style={{ width: `${gauge * 100}%` }} />
        </div>
      )}
      {(trend || meta) && (
        <footer className="stat-card__footer">
          {trend && (
            <span className={`stat-card__trend ${trend.isPositive ? 'stat-card__trend--up' : 'stat-card__trend--down'}`}>
              <span className="trend-arrow">{trend.isPositive ? '↑' : '↓'}</span>
              {trend.value}
            </span>
          )}
          {meta && <span className="stat-card__meta">{meta}</span>}
        </footer>
      )}
    </article>
  )
}

export default StatCard
