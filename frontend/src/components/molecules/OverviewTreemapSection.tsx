import React from 'react'
import TreemapChart from '../TreemapChart'

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

type OverviewTreemapSectionProps = {
  groups: TreemapGroup[]
  activeLeafId: string | null
  onSelectLeaf: (id: string) => void
}

/**
 * Molecule: OverviewTreemapSection
 */
export const OverviewTreemapSection: React.FC<OverviewTreemapSectionProps & { flat?: boolean }> = ({
  groups,
  activeLeafId,
  onSelectLeaf,
  flat = false
}) => (
  <TreemapChart
    title="各區域學生規模分佈比例"
    subtitle={undefined}
    groups={groups}
    activeLeafId={activeLeafId}
    onSelectLeaf={onSelectLeaf}
    className="dashboard-card--premium"
    showHeader={false}
    flat={flat}
  >
    <p className="dashboard-card__subtitle" style={{ margin: 0, opacity: 0.8 }}>
      以五大區域為分類基準，掃描各地區學生數構成
    </p>
  </TreemapChart>
)

export default OverviewTreemapSection
