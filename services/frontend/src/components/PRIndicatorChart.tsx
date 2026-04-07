import { useMemo, useState } from 'react'

import { useChartAnimation } from '../hooks/useChartAnimation'

type PRIndicatorChartProps = {
  schoolName: string
  rank: number
  total: number
  scopeLabel: string
  className?: string
  flat?: boolean
  showHeader?: boolean
}

function getBandLabel(percentile: number) {
  if (percentile >= 90) return '前段核心'
  if (percentile >= 75) return '高於多數'
  if (percentile >= 50) return '中上區間'
  if (percentile >= 25) return '仍有提升空間'
  return '需補強定位'
}

function PRIndicatorChart({
  schoolName,
  rank,
  total,
  scopeLabel,
  className,
  flat,
  showHeader = true,
}: PRIndicatorChartProps) {
  const { ref, isVisible } = useChartAnimation()
  const [showDetail, setShowDetail] = useState(false)
  const hasComparableCohort = total >= 3
  const percentile = useMemo(() => {
    if (!hasComparableCohort) return 0
    return Number((((total - rank) / Math.max(total - 1, 1)) * 100).toFixed(1))
  }, [hasComparableCohort, rank, total])

  const combinedClasses = [
    'dashboard-card',
    'pr-indicator',
    flat ? 'dashboard-card--flat' : '',
    isVisible ? 'chart-enter chart-enter--visible' : 'chart-enter',
    className || ''
  ].filter(Boolean).join(' ')

  const bandLabel = getBandLabel(percentile)

  return (
    <section className={combinedClasses} ref={ref as React.RefObject<HTMLElement>} aria-label={`${schoolName} 在 ${scopeLabel} 的百分等級 ${percentile}`}>
      {showHeader && (
        <div className="dashboard-card__head">
          <div className="panel-heading__stack">
            <h3 className="dashboard-card__title">{schoolName} 在 {scopeLabel} 的位置</h3>
            <p className="dashboard-card__subtitle">百分等級愈高，代表在同範圍與同學制中位於更前段。</p>
          </div>
        </div>
      )}

      <div className="dashboard-card__body">

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

      <button
        type="button"
        className="pr-indicator__track-button"
        onClick={() => setShowDetail(true)}
        onMouseEnter={() => setShowDetail(true)}
        onMouseLeave={() => setShowDetail(false)}
        onFocus={() => setShowDetail(true)}
        onBlur={() => setShowDetail(false)}
        aria-label={`${schoolName} 在 ${scopeLabel} 的 PR ${hasComparableCohort ? percentile : '不可計算'}`}
      >
        <div className="pr-indicator__track" aria-hidden="true">
          <span className="pr-indicator__band pr-indicator__band--low" />
          <span className="pr-indicator__band pr-indicator__band--mid" />
          <span className="pr-indicator__band pr-indicator__band--high" />
          {hasComparableCohort ? <span className="pr-indicator__marker" style={{ left: isVisible ? `${percentile}%` : '0%' }} /> : null}
        </div>
      </button>

      {showDetail ? (
        <div className="chart-tooltip chart-tooltip--visible pr-indicator__tooltip" role="note" aria-live="polite">
          <div className="chart-tooltip__title">{schoolName}</div>
          <div className="chart-tooltip__row">
            <span>百分等級</span>
            <span className="chart-tooltip__value">{hasComparableCohort ? `${percentile}` : '不可計算'}</span>
          </div>
          <div className="chart-tooltip__row">
            <span>樣本</span>
            <span className="chart-tooltip__value">{total} 所</span>
          </div>
        </div>
      ) : null}

      <div className="pr-indicator__ticks" aria-hidden="true">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
      </div>
    </section>
  )
}

export default PRIndicatorChart