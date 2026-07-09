import { SEGMENT_DELTA_MIN_HEIGHT } from './constants'
import { formatStackedTrendValue } from './formatters'
import { getSeriesValue, getStackBaseValue, getYearX } from './geometry'
import { StackedTrendValueBadge } from './StackedTrendValueBadge'
import type { TrendSeries, ValueScale } from './types'

type StackedTrendYearIndicatorsProps = {
  dataSeries: TrendSeries[]
  dataYears: number[]
  yearTotals: number[]
  chartInnerWidth: number
  paddingLeft: number
  getValueY: ValueScale
}

export function StackedTrendYearIndicators({
  dataSeries,
  dataYears,
  yearTotals,
  chartInnerWidth,
  paddingLeft,
  getValueY,
}: StackedTrendYearIndicatorsProps) {
  return (
    <>
      {dataYears.map((year, yearIndex) => {
        const barXCenter = getYearX(yearIndex, paddingLeft, chartInnerWidth, dataYears.length)
        const previousTotal = yearIndex > 0 ? yearTotals[yearIndex - 1] : null
        const totalDelta = previousTotal !== null ? yearTotals[yearIndex] - previousTotal : null
        const totalDeltaPct =
          previousTotal && previousTotal > 0 ? ((yearTotals[yearIndex] - previousTotal) / previousTotal) * 100 : null

        return (
          <g key={year} className="trend-molecule--indicator-group">
            <g transform={`translate(${barXCenter}, ${getValueY(yearTotals[yearIndex]) - 10})`}>
              <text y={-18} textAnchor="middle" fontSize="14" fontWeight="900" fill="#1e293b">
                {formatStackedTrendValue(yearTotals[yearIndex])}
              </text>

              {totalDelta !== null && (
                <g transform="translate(0, 0)">
                  <rect
                    x="-22"
                    y="-9"
                    width="44"
                    height="15"
                    rx="5"
                    fill={totalDelta === 0 ? '#94a3b8' : totalDelta > 0 ? '#10b981' : '#f43f5e'}
                    opacity="0.15"
                  />
                  <text
                    x="0"
                    y="2.5"
                    textAnchor="middle"
                    fontSize="10.5"
                    fontWeight="900"
                    fill={totalDelta === 0 ? '#64748b' : totalDelta > 0 ? '#059669' : '#e11d48'}
                  >
                    {totalDeltaPct !== null ? `${totalDeltaPct > 0 ? '+' : ''}${totalDeltaPct.toFixed(1)}%` : ''}
                  </text>
                </g>
              )}
            </g>

            <text x={barXCenter} y={getValueY(0) + 24} textAnchor="middle" fontSize="13" fontWeight="800" fill="#64748b">
              {year}
            </text>

            {dataSeries.map((series, seriesIndex) => {
              const value = getSeriesValue(series, year)
              const previousYearValue =
                yearIndex > 0 ? getSeriesValue(series, dataYears[yearIndex - 1]) : null
              const delta = previousYearValue !== null ? value - previousYearValue : 0
              const stackBaseValue = getStackBaseValue(dataSeries, seriesIndex, year)
              const ySegmentTop = getValueY(stackBaseValue + value)
              const ySegmentBottom = getValueY(stackBaseValue)
              const yCenter = (ySegmentTop + ySegmentBottom) / 2

              if (ySegmentBottom - ySegmentTop < SEGMENT_DELTA_MIN_HEIGHT) return null

              return <StackedTrendValueBadge key={series.label} x={barXCenter} y={yCenter + 4} delta={delta} />
            })}
          </g>
        )
      })}
    </>
  )
}
