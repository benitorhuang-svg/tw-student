import type { ReactNode } from 'react'

type TreemapLeaf = {
  id: string
  label: string
  value: number
  meta?: string
  color?: string
}

type TreemapGroup = {
  id: string
  label: string
  value: number
  accentColor: string
  children: TreemapLeaf[]
}

export type OverviewTreemapRenderProps = {
  title: string
  subtitle?: ReactNode
  groups: TreemapGroup[]
  activeLeafId: string | null
  onSelectLeaf: (id: string) => void
  className: string
  showHeader: boolean
  flat: boolean
  children: ReactNode
}

export type OverviewTreemapSectionProps = {
  groups: TreemapGroup[]
  activeLeafId: string | null
  onSelectLeaf: (id: string) => void
  renderTreemapChart: (props: OverviewTreemapRenderProps) => ReactNode
  flat?: boolean
}

/**
 * Molecule: OverviewTreemapSection
 */
export function OverviewTreemapSection({
  groups,
  activeLeafId,
  onSelectLeaf,
  renderTreemapChart,
  flat = false
}: OverviewTreemapSectionProps) {
  return renderTreemapChart({
    title: '各區域學生規模分佈比例',
    groups,
    activeLeafId,
    onSelectLeaf,
    className: 'dashboard-card--premium',
    showHeader: false,
    flat,
    children: (
      <p className="dashboard-card__subtitle" style={{ margin: 0, opacity: 0.8 }}>
        以五大區域為分類基準，掃描各地區學生數構成
      </p>
    ),
  })
}

export default OverviewTreemapSection
