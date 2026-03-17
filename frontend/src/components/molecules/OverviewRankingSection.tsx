import React, { useMemo } from 'react'
import type { RankingSummary } from '../../lib/analytics'

type OverviewRankingSectionProps = {
  rankingRows: RankingSummary[]
  onSelectCounty: (id: string) => void
  flat?: boolean
}

/**
 * Molecule: OverviewRankingSection
 */
export const OverviewRankingSection: React.FC<OverviewRankingSectionProps> = ({ 
  rankingRows,
  onSelectCounty,
  flat = false
}) => {
  const maxStudents = useMemo(() => Math.max(...rankingRows.map(r => r.students), 1), [rankingRows])
  const maxDeltaRatio = useMemo(() => Math.max(...rankingRows.map(r => Math.abs(r.deltaRatio)), 0.01), [rankingRows])

  const topByStudents = useMemo(() => [...rankingRows].sort((a, b) => b.students - a.students).slice(0, 3), [rankingRows])
  const topByGrowth = useMemo(() => [...rankingRows].sort((a, b) => b.deltaRatio - a.deltaRatio).slice(0, 3), [rankingRows])
  const bottomByGrowth = useMemo(() => [...rankingRows].sort((a, b) => a.deltaRatio - b.deltaRatio).slice(0, 3), [rankingRows])

  const RankCard = ({ title, items, type }: { title: string, items: any[], type: 'count' | 'growth' | 'decline' }) => (
    <div className="ranking-card">
      <h4 className="ranking-card__title">{title}</h4>
      <div className="ranking-card__list">
        {items.map((item, idx) => {
          const ratio = type === 'count' 
            ? (item.students / maxStudents) * 100 
            : (Math.abs(item.deltaRatio) / maxDeltaRatio) * 100
            
          return (
            <div 
              key={item.id} 
              className="ranking-item" 
              onClick={() => onSelectCounty(item.id)}
            >
              <div className="ranking-item__header">
                <div className={`ranking-item__rank ranking-item__rank--${idx + 1}`}>{idx + 1}</div>
                <span className="ranking-item__name">{item.label}</span>
                <span className="ranking-item__value">
                  {type === 'count' ? `${(item.students / 10000).toFixed(1)} 萬` : 
                   `${item.deltaRatio > 0 ? '+' : ''}${(item.deltaRatio * 100).toFixed(1)}%`}
                </span>
              </div>
              <div className="ranking-item__visual">
                <div className="ranking-item__track">
                  <div 
                    className={`ranking-item__fill ranking-item__fill--${type}`} 
                    style={{ width: `${ratio}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <section className={`overview-ranking-card ${flat ? "dashboard-card--flat" : "dashboard-card"}`}>
      <div className="dashboard-card__body">
        <div className="overview-ranking-grid">
          <RankCard title="學生規模前三名" items={topByStudents} type="count" />
          <RankCard title="成長力道前三名" items={topByGrowth} type="growth" />
          <RankCard title="減幅最明顯縣市" items={bottomByGrowth} type="decline" />
        </div>
      </div>
    </section>
  )
}

export default OverviewRankingSection
