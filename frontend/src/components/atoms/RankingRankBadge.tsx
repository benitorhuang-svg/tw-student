type RankingRankBadgeProps = {
  rank: number
}

function RankingRankBadge({ rank }: RankingRankBadgeProps) {
  return (
    <span className={`ranking-rank-badge ranking-rank-badge--${rank}`} aria-label={`第 ${rank} 名`}>
      {rank}
    </span>
  )
}

export default RankingRankBadge