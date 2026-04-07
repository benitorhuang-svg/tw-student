import { useEffect, useMemo, useRef, useState } from 'react'

import { useChartAnimation } from '../hooks/useChartAnimation'
import { formatStudents } from '../lib/analytics'

type HistogramChartProps = {
  title: string
  subtitle: string
  values: number[]
  activeValue?: number | null
  className?: string
  flat?: boolean
  showHeader?: boolean
}

type Bin = {
  start: number
  end: number
  count: number
}

function formatRange(start: number, end: number) {
  if (start === end) return formatStudents(start)
  return `${formatStudents(start)}-${formatStudents(end)}`
}

function getResponsiveBinCount(valueCount: number, containerWidth: number) {
  const idealBinCount = Math.round(Math.sqrt(valueCount))
  if (containerWidth <= 0) {
    return Math.min(Math.max(idealBinCount, 4), 8)
  }

  const maxBins = containerWidth < 360 ? 4 : containerWidth < 520 ? 5 : containerWidth < 720 ? 6 : 8
  const minBins = 4
  return Math.min(Math.max(idealBinCount, minBins), maxBins)
}

function buildBins(values: number[], containerWidth: number) {
  if (values.length === 0) return [] as Bin[]

  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) {
    return [{ start: min, end: max, count: values.length }]
  }

  const binCount = getResponsiveBinCount(values.length, containerWidth)
  const range = max - min
  const rawBinSize = range / binCount
  const magnitude = 10 ** Math.max(Math.floor(Math.log10(rawBinSize)), 0)
  const binSize = Math.max(Math.ceil(rawBinSize / magnitude) * magnitude, 1)
  const startBase = Math.floor(min / binSize) * binSize
  const bins = Array.from({ length: binCount }, (_, index) => ({
    start: startBase + index * binSize,
    end: startBase + (index + 1) * binSize,
    count: 0,
  }))

  values.forEach((value) => {
    const roughIndex = Math.floor((value - startBase) / binSize)
    const index = Math.min(Math.max(roughIndex, 0), bins.length - 1)
    bins[index].count += 1
  })

  bins[bins.length - 1].end = Math.max(bins[bins.length - 1].end, max)
  return bins
}

function HistogramChart({
  title,
  subtitle,
  values,
  activeValue = null,
  className,
  flat,
  showHeader = true,
}: HistogramChartProps) {
  const { ref, isVisible } = useChartAnimation()
  const barsRef = useRef<HTMLDivElement | null>(null)
  const [barsWidth, setBarsWidth] = useState(0)
  const bins = useMemo(() => buildBins(values, barsWidth), [barsWidth, values])
  const [detailIndex, setDetailIndex] = useState<number | null>(null)
  const maxCount = Math.max(...bins.map((bin) => bin.count), 1)
  const average = values.length > 0 ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0
  const sortedValues = [...values].sort((left, right) => left - right)
  const median = sortedValues.length > 0 ? sortedValues[Math.floor((sortedValues.length - 1) / 2)] : 0
  const condensedRangeLabels = barsWidth < 420 && bins.length > 4

  const combinedClasses = [
    'dashboard-card',
    'histogram-chart',
    flat ? 'dashboard-card--flat' : '',
    isVisible ? 'chart-enter chart-enter--visible' : 'chart-enter',
    className || ''
  ].filter(Boolean).join(' ')

  useEffect(() => {
    const node = barsRef.current
    if (!node || typeof ResizeObserver === 'undefined') {
      return
    }

    const updateWidth = (nextWidth: number) => {
      setBarsWidth((currentWidth) => {
        const roundedWidth = Math.round(nextWidth)
        return currentWidth === roundedWidth ? currentWidth : roundedWidth
      })
    }

    updateWidth(node.clientWidth)

    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width ?? node.clientWidth
      updateWidth(nextWidth)
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  if (values.length < 4) {
    return (
      <section className={combinedClasses} ref={ref as React.RefObject<HTMLElement>}>
        {showHeader && (
          <div className="dashboard-card__head">
            <div className="panel-heading__stack">
              <h3 className="dashboard-card__title">{title}</h3>
              <p className="dashboard-card__subtitle">{subtitle}</p>
            </div>
          </div>
        )}
        <div className="dashboard-card__body">
          <div className="histogram-chart__compact-grid">
            <article>
              <span>樣本數</span>
              <strong>{values.length} 校</strong>
            </article>
            <article>
              <span>平均</span>
              <strong>{formatStudents(average)} 人</strong>
            </article>
            <article>
              <span>中位數</span>
              <strong>{formatStudents(median)} 人</strong>
            </article>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={combinedClasses} ref={ref as React.RefObject<HTMLElement>}>
      {showHeader && (
        <div className="dashboard-card__head">
          <div className="panel-heading__stack">
            <h3 className="dashboard-card__title">{title}</h3>
            <p className="dashboard-card__subtitle">{subtitle}</p>
          </div>
        </div>
      )}

      <div className="dashboard-card__body">
        <div className="histogram-chart__summary" aria-hidden="true">
          <span>平均 {formatStudents(average)} 人</span>
          <span>中位數 {formatStudents(median)} 人</span>
          <span>{values.length} 校樣本</span>
        </div>

        <div ref={barsRef} className="histogram-chart__bars" role="list" aria-label={title}>
          {bins.map((bin, index) => {
            const isActive = activeValue !== null && activeValue >= bin.start && (index === bins.length - 1 ? activeValue <= bin.end : activeValue < bin.end)
            const isDetailed = detailIndex === index || isActive
            const showRangeLabel = !condensedRangeLabels || isDetailed || index === 0 || index === bins.length - 1 || index % 2 === 0
            return (
              <button
                key={`${bin.start}-${bin.end}`}
                type="button"
                className={isActive ? 'histogram-chart__bin histogram-chart__bin--active' : 'histogram-chart__bin'}
                onClick={() => setDetailIndex(index)}
                onMouseEnter={() => setDetailIndex(index)}
                onMouseLeave={() => setDetailIndex(null)}
                onFocus={() => setDetailIndex(index)}
                onBlur={() => setDetailIndex(null)}
                aria-pressed={isDetailed}
                aria-label={`${formatRange(bin.start, bin.end)}，${bin.count} 校`}
              >
                <div className="histogram-chart__bar-track">
                  <div className="histogram-chart__bar-fill" style={{ height: isVisible ? `${(bin.count / maxCount) * 100}%` : '0%' }} />
                </div>
                <strong className="histogram-chart__count">{bin.count}</strong>
                <span className={showRangeLabel ? 'histogram-chart__range' : 'histogram-chart__range histogram-chart__range--condensed'}>{showRangeLabel ? formatRange(bin.start, bin.end) : ' '}</span>
                {isDetailed ? (
                  <div className="chart-tooltip chart-tooltip--visible histogram-chart__tooltip" role="note" aria-live="polite">
                    <div className="chart-tooltip__title">{formatRange(bin.start, bin.end)}</div>
                    <div className="chart-tooltip__row">
                      <span>樣本數</span>
                      <span className="chart-tooltip__value">{bin.count} 校</span>
                    </div>
                  </div>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default HistogramChart