import type { ReactNode } from 'react'

export type TreemapLeaf = {
  id: string
  label: string
  value: number
  meta?: string
  color?: string
}

export type TreemapGroup = {
  id: string
  label: string
  value: number
  accentColor: string
  children: TreemapLeaf[]
}

export type TreemapChartProps = {
  title: string
  subtitle?: ReactNode
  groups: TreemapGroup[]
  activeLeafId?: string | null
  onSelectLeaf?: (id: string) => void
  onSelectGroup?: (id: string) => void
  className?: string
  flat?: boolean
  showHeader?: boolean
  children?: ReactNode
}
