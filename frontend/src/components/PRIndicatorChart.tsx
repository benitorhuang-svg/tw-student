import { useMemo } from 'react'

import { useChartAnimation } from '../hooks/useChartAnimation'

type PRIndicatorChartProps = {
  schoolName: string
  rank: number
  total: number
  scopeLabel: string
}

function getBandLabel(percentile: number) {
  if (percentile >= 90) return '前段核心'
  if (percentile >= 75) return '高於多數'
  if (percentile >= 50) return '中上區間'
  if (percentile >= 25) return '仍有提升空間'
  return '需補強定位'
}

function PRIndicatorChart({ schoolName, rank, total, scopeLabel }: PRIndicatorChartProps) {
  const { ref, isVisible } = useChartAnimation()
  const hasComparableCohort = total >= 3
  const percentile = useMemo(() => {
    if (!hasComparableCohort) return 0
    return Number((((total - rank) / Math.max(total - 1, 1)) * 100).toFixed(1))
  }, [hasComparableCohort, rank, total])

  const bandLabel = getBandLabel(percentile)

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className={isVisible ? 'pr-indicator chart-enter chart-enter--visible' : 'pr-indicator chart-enter'}
      aria-label={`${schoolName} 在 ${scopeLabel} 的百分等級 ${percentile}`}
    >
      <div className="panel-heading pr-indicator__heading">
        <div>
          <p className="eyebrow">PR 定位指標</p>
          <h3>{schoolName} 在 {scopeLabel} 的位置</h3>
        </div>
        <p className="panel-heading__meta">百分等級愈高，代表在同範圍與同學制 cohort 中位於更前段。</p>
      </div>

      <div className="pr-indicator__score-row">
        <div className="pr-indicator__score-block">
          <strong>{hasComparableCohort ? percentile : '—'}</strong>
          <span>{hasComparableCohort ? 'PR' : '樣本不足'}</span>
        </div>
        <div className="pr-indicator__score-copy">
          <strong>{hasComparableCohort ? bandLabel : '目前無法形成可信百分等級'}</strong>
          <p>
            {hasComparableCohort
              ? `目前排名第 ${rank} / ${total}，可快速判讀是否位於前段、均值附近或後段區間。`
              : `目前可比樣本僅 ${total} 所，暫以排名與規模對照為主，不直接輸出 PR。`}
          </p>
        </div>
      </div>

      <div className="pr-indicator__track" aria-hidden="true">
        <span className="pr-indicator__band pr-indicator__band--low" />
        <span className="pr-indicator__band pr-indicator__band--mid" />
        <span className="pr-indicator__band pr-indicator__band--high" />
        {hasComparableCohort ? <span className="pr-indicator__marker" style={{ left: isVisible ? `${percentile}%` : '0%' }} /> : null}
      </div>

      <div className="pr-indicator__ticks" aria-hidden="true">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
    </section>
  )
}

export default PRIndicatorChart