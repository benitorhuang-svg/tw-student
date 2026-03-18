type RankingMetricBarProps = {
  tone: 'count' | 'growth' | 'decline'
  value: number
}

function RankingMetricBar({ tone, value }: RankingMetricBarProps) {
  const safeValue = Number.isFinite(value) ? Math.min(100, Math.max(value, 6)) : 6

  return (
    <span className="ranking-metric-bar" aria-hidden="true">
      <span
        className={`ranking-metric-bar__fill ranking-metric-bar__fill--${tone}`}
        style={{ width: `${safeValue}%` }}
      />
    </span>
  )
}

export default RankingMetricBar