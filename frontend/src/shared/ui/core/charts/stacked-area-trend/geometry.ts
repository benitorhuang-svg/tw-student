import type { TrendSeries, ValueScale } from './types'

export function getYearX(index: number, paddingLeft: number, chartInnerWidth: number, yearCount: number) {
  return paddingLeft + (index + 0.5) * (chartInnerWidth / yearCount)
}

export function getSeriesValue(series: TrendSeries, year: number) {
  return series.points.find((point) => point.year === year)?.value ?? 0
}

export function getStackBaseValue(dataSeries: TrendSeries[], seriesIndex: number, year: number) {
  return dataSeries
    .slice(0, seriesIndex)
    .reduce((sum, previousSeries) => sum + getSeriesValue(previousSeries, year), 0)
}

export function buildTotalTrendPath(options: {
  dataYears: number[]
  yearTotals: number[]
  paddingLeft: number
  chartInnerWidth: number
  getValueY: ValueScale
}) {
  const { dataYears, yearTotals, paddingLeft, chartInnerWidth, getValueY } = options

  return dataYears.reduce((path, _year, index) => {
    const x = getYearX(index, paddingLeft, chartInnerWidth, dataYears.length)
    const y = getValueY(yearTotals[index])

    if (index === 0) return `M ${x} ${y}`

    const previousX = getYearX(index - 1, paddingLeft, chartInnerWidth, dataYears.length)
    const previousY = getValueY(yearTotals[index - 1])
    const cp1x = previousX + (x - previousX) / 3
    const cp2x = previousX + ((x - previousX) * 2) / 3
    return `${path} C ${cp1x} ${previousY}, ${cp2x} ${y}, ${x} ${y}`
  }, '')
}
