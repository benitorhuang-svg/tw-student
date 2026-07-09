import type { RefObject } from 'react'

import { useChartAnimation } from '@/shared/lib/hooks/core/useChartAnimation'
import { useResponsiveSvg } from '@/shared/lib/hooks/core/useResponsiveSvg'
import '@/shared/ui/styles/data/charts/01-historical-trend-redesign.css'
import {
  MULTI_SERIES_BASE_HEIGHT,
  MULTI_SERIES_MAX_HEIGHT,
  RECENT_YEAR_COUNT,
  SERIES_COLORS,
  SINGLE_SERIES_BASE_HEIGHT,
  SINGLE_SERIES_MAX_HEIGHT,
} from './constants'
import { buildTotalTrendPath } from './geometry'
import { StackedTrendBars } from './StackedTrendBars'
import { StackedTrendCategoryLabels } from './StackedTrendCategoryLabels'
import { StackedTrendDefs } from './StackedTrendDefs'
import { StackedTrendYearIndicators } from './StackedTrendYearIndicators'
import type { StackedAreaTrendChartProps } from './types'

export function StackedAreaTrendChart({
  title,
  subtitle,
  series,
  children,
  className,
  flat,
  showHeader = true,
}: StackedAreaTrendChartProps) {
  const { ref: animRef, isVisible } = useChartAnimation()
  const dataSeries = series.map((item) => ({
    ...item,
    points: item.points.filter((point) => point.year >= 100),
  }))

  const isSingleSeries = dataSeries.length <= 1
  const baseHeight = isSingleSeries ? SINGLE_SERIES_BASE_HEIGHT : MULTI_SERIES_BASE_HEIGHT
  const { containerRef, width, height: responsiveHeight } = useResponsiveSvg(800, baseHeight, {
    minWidth: 340,
    minHeight: 200,
  })
  const height = Math.min(responsiveHeight, isSingleSeries ? SINGLE_SERIES_MAX_HEIGHT : MULTI_SERIES_MAX_HEIGHT)
  const paddingLeft = isSingleSeries ? 20 : width < 520 ? 60 : 85
  const paddingRight = width < 420 ? 10 : 20
  const paddingTop = isSingleSeries ? 40 : 32
  const paddingBottom = 40
  const allYears = Array.from(new Set(dataSeries.flatMap((item) => item.points.map((point) => point.year)))).sort(
    (left, right) => left - right,
  )
  const dataYears = allYears.slice(-RECENT_YEAR_COUNT)
  const combinedClasses = [
    'dashboard-card',
    'historical-trend-chart',
    'dashboard-card--glass',
    flat ? 'dashboard-card--flat' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ')

  if (dataYears.length === 0) {
    return (
      <section className={combinedClasses} ref={animRef as RefObject<HTMLElement>}>
        {showHeader && (
          <div className="dashboard-card__head">
            <h3 className="dashboard-card__title">{title}</h3>
          </div>
        )}
        <div className="dashboard-card__body">
          <div className="chart-empty-state">尚無資料</div>
        </div>
      </section>
    )
  }

  const yearTotals = dataYears.map((year) =>
    dataSeries.reduce((sum, item) => sum + (item.points.find((point) => point.year === year)?.value ?? 0), 0),
  )
  const maxTotal = Math.max(...yearTotals, 100)
  const maxValue = maxTotal * (isSingleSeries ? 1.3 : 1.1)
  const chartInnerWidth = width - paddingLeft - paddingRight
  const chartInnerHeight = height - paddingTop - paddingBottom
  const getValueY = (value: number) => paddingTop + chartInnerHeight - (value / maxValue) * chartInnerHeight
  const barWidth = (chartInnerWidth / dataYears.length) * 0.65
  const totalTrendPath = buildTotalTrendPath({
    dataYears,
    yearTotals,
    paddingLeft,
    chartInnerWidth,
    getValueY,
  })

  return (
    <section className={combinedClasses} ref={animRef as RefObject<HTMLElement>}>
      {showHeader && (title || children) && (
        <div className="dashboard-card__head">
          <div className="panel-heading__stack">
            {title && <h3 className="dashboard-card__title">{title}</h3>}
            {subtitle && (typeof subtitle === 'string' ? <p className="dashboard-card__subtitle">{subtitle}</p> : subtitle)}
            {children}
          </div>
        </div>
      )}

      <div className="dashboard-card__body" style={{ padding: '0px', overflow: 'visible' }}>
        <div className="chart-svg-frame" ref={containerRef}>
          <svg
            className={`stacked-area-chart__svg${isVisible ? ' chart-enter chart-enter--visible' : ' chart-enter'}`}
            viewBox={`0 0 ${width} ${height}`}
            style={{ overflow: 'visible' }}
          >
            <StackedTrendDefs colors={SERIES_COLORS} />
            <line
              x1={paddingLeft}
              x2={width - paddingRight}
              y1={getValueY(0)}
              y2={getValueY(0)}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <StackedTrendCategoryLabels dataSeries={dataSeries} dataYears={dataYears} getValueY={getValueY} />
            <StackedTrendBars
              dataSeries={dataSeries}
              dataYears={dataYears}
              chartInnerWidth={chartInnerWidth}
              paddingLeft={paddingLeft}
              barWidth={barWidth}
              getValueY={getValueY}
            />
            <path
              d={totalTrendPath}
              stroke="rgba(0,0,0,0.1)"
              strokeWidth="2"
              fill="none"
              strokeDasharray="4 4"
            />
            <StackedTrendYearIndicators
              dataSeries={dataSeries}
              dataYears={dataYears}
              yearTotals={yearTotals}
              chartInnerWidth={chartInnerWidth}
              paddingLeft={paddingLeft}
              getValueY={getValueY}
            />
          </svg>
        </div>
      </div>
    </section>
  )
}

export default StackedAreaTrendChart
