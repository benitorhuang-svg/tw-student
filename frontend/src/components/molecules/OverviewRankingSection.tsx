import React, { useMemo } from 'react'
import { formatPercent, type RankingSummary } from '../../lib/analytics'
import RankingCategoryCard from './RankingCategoryCard'
import '../../styles/organisms/overview-ranking-redesign.css'

type OverviewRankingSectionProps = {
  rankingRows: RankingSummary[]
  onSelectCounty: (id: string) => void
  flat?: boolean
}

const Icons = {
  Scale: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  ),
  Growth: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  Decline: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </svg>
  )
}

function formatStudentWan(students: number) {
  return `${(students / 10000).toFixed(1)} 萬`
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

  const categories = useMemo(() => ([
    {
      key: 'count',
      title: '規模排行',
      tone: 'count' as const,
      icon: <Icons.Scale />,
      items: topByStudents.map((item) => ({
        ...item,
        emphasisValue: formatStudentWan(item.students),
        ratio: (item.students / maxStudents) * 100,
      })),
    },
    {
      key: 'growth',
      title: '成長動能',
      tone: 'growth' as const,
      icon: <Icons.Growth />,
      items: topByGrowth.map((item) => ({
        ...item,
        emphasisValue: formatPercent(item.deltaRatio),
        ratio: (Math.abs(item.deltaRatio) / maxDeltaRatio) * 100,
      })),
    },
    {
      key: 'decline',
      title: '收縮警戒',
      tone: 'decline' as const,
      icon: <Icons.Decline />,
      items: bottomByGrowth.map((item) => ({
        ...item,
        emphasisValue: formatPercent(item.deltaRatio),
        ratio: (Math.abs(item.deltaRatio) / maxDeltaRatio) * 100,
      })),
    },
  ]), [bottomByGrowth, maxDeltaRatio, maxStudents, topByGrowth, topByStudents])

  if (rankingRows.length === 0) {
    return (
      <section className={`overview-ranking-card ${flat ? 'overview-ranking--flat' : ''}`}>
        <div className="overview-ranking-empty">
          <p>目前篩選條件下沒有可用的縣市排行資料。</p>
        </div>
      </section>
    )
  }

  return (
    <section className={`overview-ranking-redesign ${flat ? 'overview-ranking--flat' : ''}`}>
      <div className="overview-ranking-grid">
        {categories.map((category) => (
          <RankingCategoryCard
            key={category.key}
            title={category.title}
            tone={category.tone}
            icon={category.icon}
            items={category.items}
            onSelectCounty={onSelectCounty}
          />
        ))}
      </div>
    </section>
  )
}

export default OverviewRankingSection
