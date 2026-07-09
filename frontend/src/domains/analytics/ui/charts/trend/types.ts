import type { TrendPoint } from '@/shared/lib/analytics'

export type TrendChartProps = {
  chartId: string
  title: string
  subtitle: string
  points: TrendPoint[]
  benchmarkPoints?: TrendPoint[]
  activeYear: number
  showHeader?: boolean
  formatValue?: (value: number) => string
  benchmarkLabel?: string
  predictionLabel?: string
  className?: string
  flat?: boolean
}
