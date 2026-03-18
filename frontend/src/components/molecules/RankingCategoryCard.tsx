import type { ReactNode } from 'react'
import type { RankingSummary } from '../../lib/analytics'
import RankingMetricBar from '../atoms/RankingMetricBar'

type RankingCategoryCardProps = {
  title: string
  tone: 'count' | 'growth' | 'decline'
  icon: ReactNode
  items: Array<RankingSummary & { emphasisValue: string; ratio: number }>
  onSelectCounty: (id: string) => void
}

function RankingCategoryCard({
  title,
  tone,
  icon,
  items,
  onSelectCounty,
}: RankingCategoryCardProps) {
  return (
    <article className={`ranking-category-card ranking-category-card--${tone}`}>
      <div className="ranking-category-card__main">
        <header className="ranking-category-card__header">
          <div className="ranking-category-card__title-group">
            <div className="ranking-category-card__icon-wrap">{icon}</div>
            <h3 className="ranking-category-card__title">{title}</h3>
          </div>
        </header>

        <div className="ranking-list-simplified">
          {items.map((item, index) => (
            <button
              key={item.id}
              className={`ranking-item-compact-new ranking-item--rank-${index + 1}`}
              onClick={() => onSelectCounty(item.id)}
            >
              <span className="ranking-item__name">{item.label}</span>
              <span className="ranking-item__value">{item.emphasisValue}</span>
              <div className="ranking-item__bar-overlay">
                <RankingMetricBar tone={tone} value={item.ratio} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </article>
  )
}

export default RankingCategoryCard