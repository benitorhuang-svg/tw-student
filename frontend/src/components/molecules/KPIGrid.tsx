import React from 'react'
import StatCard from '../atoms/StatCard'

type kpItem = {
  label: string
  value: string | number
  unit?: string
  trend?: {
    value: number | string
    isPositive: boolean
  }
  meta?: string
}

type KPIGridProps = {
  items: kpItem[]
  columns?: number
  className?: string
}

/**
 * Molecule: KPIGrid
 * 組合多個 StatCard，形成標準的指標展示列
 */
export const KPIGrid: React.FC<KPIGridProps> = ({ 
  items, 
  columns = 3,
  className = '' 
}) => {
  return (
    <div 
      className={`kpi-grid ${className}`} 
      style={{ '--grid-cols': columns } as React.CSSProperties}
    >
      {items.map((item, idx) => (
        <StatCard key={`${item.label}-${idx}`} {...item} />
      ))}
    </div>
  )
}

export default KPIGrid
