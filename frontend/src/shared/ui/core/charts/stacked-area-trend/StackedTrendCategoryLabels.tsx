import { getSeriesValue, getStackBaseValue } from './geometry'
import type { TrendSeries, ValueScale } from './types'

type StackedTrendCategoryLabelsProps = {
  dataSeries: TrendSeries[]
  dataYears: number[]
  getValueY: ValueScale
}

export function StackedTrendCategoryLabels({
  dataSeries,
  dataYears,
  getValueY,
}: StackedTrendCategoryLabelsProps) {
  if (dataSeries.length <= 1 || dataYears.length === 0) {
    return null
  }

  const firstYear = dataYears[0]

  return (
    <>
      {dataSeries.map((series, seriesIndex) => {
        const value = getSeriesValue(series, firstYear)
        const stackBaseValue = getStackBaseValue(dataSeries, seriesIndex, firstYear)
        const yCenter = (getValueY(stackBaseValue) + getValueY(stackBaseValue + value)) / 2
        const standardizedName = series.label.replace('院校', '')

        return (
          <g key={`leg-${series.label}`}>
            <text
              x={20}
              y={yCenter}
              alignmentBaseline="middle"
              fontSize="13"
              fontWeight="800"
              fill="#334155"
              style={{ letterSpacing: '0.02em' }}
            >
              {standardizedName}
            </text>
          </g>
        )
      })}
    </>
  )
}
