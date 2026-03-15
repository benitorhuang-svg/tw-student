import React from 'react'
import ScatterPlotChart from '../ScatterPlotChart'
import StackedAreaTrendChart from '../StackedAreaTrendChart'
import TreemapChart from '../TreemapChart'
import type { TrendPoint } from '../../lib/analytics.types'

type OverviewMatrixSectionProps = {
  points: any[]
  activePointId: string | null
  onHoverPoint: (id: string | null) => void
  onSelectPoint: (id: string) => void
}

export const OverviewMatrixSection: React.FC<OverviewMatrixSectionProps> = ({
  points,
  activePointId,
  onHoverPoint,
  onSelectPoint
}) => (
  <ScatterPlotChart
    title="熱點分析矩陣 (全台總覽)"
    subtitle={null}
    xLabel="學生數 (萬人)"
    yLabel="全國佔比變動率 (%)"
    points={points}
    activePointId={activePointId}
    onHoverPoint={onHoverPoint}
    onSelectPoint={onSelectPoint}
    showHeader={false}
    className="matrix-chart-premium"
  >
    <p className="dashboard-card__subtitle" style={{ margin: 0, opacity: 0.8 }}>
      X 軸學生成長，Y 軸全國佔比變動率
    </p>
  </ScatterPlotChart>
)

type OverviewTrendSectionProps = {
  series: Array<{ label: string, points: TrendPoint[] }>
}

export const OverviewTrendSection: React.FC<OverviewTrendSectionProps> = ({ series }) => (
  <StackedAreaTrendChart
    title="全台各學制歷年學生數"
    subtitle={undefined}
    series={series}
    className="dashboard-card--overview-story dashboard-card--premium"
    showHeader={false}
  >
    <p className="dashboard-card__subtitle" style={{ margin: 0, opacity: 0.8 }}>
      各教育階段歷年人數變化趨勢
    </p>
  </StackedAreaTrendChart>
)

type OverviewTreemapSectionProps = {
  groups: any[]
  activeLeafId: string | null
  onSelectLeaf: (id: string) => void
}

export const OverviewTreemapSection: React.FC<OverviewTreemapSectionProps> = ({
  groups,
  activeLeafId,
  onSelectLeaf
}) => (
  <TreemapChart
    title="各地區學生分佈比例"
    subtitle={undefined}
    groups={groups}
    activeLeafId={activeLeafId}
    onSelectLeaf={onSelectLeaf}
    className="dashboard-card--premium"
    showHeader={false}
  >
    <p className="dashboard-card__subtitle" style={{ margin: 0, opacity: 0.8 }}>
      以區域為第一層級，探討學生規模構成
    </p>
  </TreemapChart>
)
