import React from 'react'

type StatCardProps = {
  label: string
  value: string | number
  unit?: string
  trend?: {
    value: number | string
    isPositive: boolean
  }
  meta?: string
  icon?: React.ReactNode
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
  trend,
  meta,
  icon,
  className = ''
}) => {
  return (
    <article className={`stat-card ${className}`}>
      <header className="stat-card__header">
        <span className="stat-card__label">{label}</span>
        {icon && <span className="stat-card__icon">{icon}</span>}
      </header>
      <main className="stat-card__content">
        <span className="stat-card__value">{value}</span>
        {unit && <span className="stat-card__unit">{unit}</span>}
      </main>
      {(trend || meta) && (
        <footer className="stat-card__footer">
          {trend && (
            <span className={`stat-card__trend ${trend.isPositive ? 'stat-card__trend--up' : 'stat-card__trend--down'}`}>
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
