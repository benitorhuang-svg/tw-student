import React from 'react'
import ScatterPlotChart from '../ScatterPlotChart'

type OverviewMatrixSectionProps = {
  points: any[]
  activePointId: string | null
  onHoverPoint: (id: string | null) => void
  onSelectPoint: (id: string) => void
}

/**
 * Molecule: OverviewMatrixSection
 * 封裝全台消長分佈矩陣，包含特定的說明文字
 */
export const OverviewMatrixSection: React.FC<OverviewMatrixSectionProps> = ({
  points,
  activePointId,
  onHoverPoint,
  onSelectPoint
}) => (
  <ScatterPlotChart
    title="全國消長分佈矩陣"
    subtitle={null}
    xLabel="學生人數 (萬人)"
    yLabel="全國佔比變動率 (%)"
    points={points}
    activePointId={activePointId}
    onHoverPoint={onHoverPoint}
    onSelectPoint={onSelectPoint}
    className="matrix-chart-premium"
  >
    <p className="dashboard-card__subtitle" style={{ margin: 0, opacity: 0.8 }}>
      分析核心：X 軸代表學生規模，Y 軸顯示該縣市在全國佔比的消長狀況
    </p>
  </ScatterPlotChart>
)

export default OverviewMatrixSection
