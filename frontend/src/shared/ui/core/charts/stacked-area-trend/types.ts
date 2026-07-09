import type { ReactNode } from 'react'

import type { TrendPoint } from '@/shared/lib/analytics'

export type TrendSeries = {
  label: string
  points: TrendPoint[]
}

export type StackedAreaTrendChartProps = {
  title: string
  subtitle?: ReactNode
  series: TrendSeries[]
  children?: ReactNode
  className?: string
  flat?: boolean
  showHeader?: boolean
}

export type ValueScale = (value: number) => number
