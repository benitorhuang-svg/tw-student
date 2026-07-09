import { SERIES_COLORS } from './constants'
import { getSeriesValue, getStackBaseValue, getYearX } from './geometry'
import type { TrendSeries, ValueScale } from './types'

type StackedTrendBarsProps = {
  dataSeries: TrendSeries[]
  dataYears: number[]
  chartInnerWidth: number
  paddingLeft: number
  barWidth: number
  getValueY: ValueScale
}

export function StackedTrendBars({
  dataSeries,
  dataYears,
  chartInnerWidth,
  paddingLeft,
  barWidth,
  getValueY,
}: StackedTrendBarsProps) {
  return (
    <>
      {dataSeries.map((series, seriesIndex) => {
        const points = dataYears.map((year, yearIndex) => {
          const x = getYearX(yearIndex, paddingLeft, chartInnerWidth, dataYears.length)
          const currentValue = getSeriesValue(series, year)
          const stackBaseValue = getStackBaseValue(dataSeries, seriesIndex, year)
          const y0 = getValueY(stackBaseValue)
          const y1 = getValueY(stackBaseValue + currentValue)

          return { x, y0, y1, year }
        })

        return (
          <g key={series.label} className="stacked-bar-series">
            {points.map((point) => (
              <rect
                key={`bar-${point.year}`}
                x={point.x - barWidth / 2}
                y={point.y1}
                width={barWidth}
                height={Math.max(point.y0 - point.y1, 0.5)}
                fill={`url(#bar-grad-${seriesIndex % SERIES_COLORS.length})`}
                opacity="0.9"
                rx="2"
              />
            ))}
          </g>
        )
      })}
    </>
  )
}
