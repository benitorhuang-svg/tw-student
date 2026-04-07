import React from 'react'
import type { RankingSummary } from '../../lib/analytics'

type TownshipDistributionSectionProps = {
  townships: RankingSummary[]
  onSelectTownship: (id: string) => void
  flat?: boolean
}

/**
 * Molecule: TownshipDistributionSection
 */
export const TownshipDistributionSection: React.FC<TownshipDistributionSectionProps> = ({ 
  townships, 
  onSelectTownship,
  flat = false
}) => {
  const maxStudents = Math.max(...townships.map(t => t.students), 1)
  
  return (
    <section className={flat ? "" : "dashboard-card township-distribution-card"}>
      <div className={flat ? "" : "dashboard-card__body"}>
        <div className="township-distribution-list">
          {townships.slice(0, 10).map((t) => (
            <div key={t.id} className="township-bar-item" onClick={() => onSelectTownship(t.id)}>
              <div className="township-bar-item__label">
                <span className="township-bar-item__name">{t.label}</span>
                <span className="township-bar-item__value">{t.students.toLocaleString()} 人</span>
              </div>
              <div className="township-bar-item__track">
                <div 
                  className="township-bar-item__fill" 
                  style={{ width: `${(t.students / maxStudents) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default TownshipDistributionSection
