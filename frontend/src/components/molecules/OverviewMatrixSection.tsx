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
export const OverviewMatrixSection: React.FC<OverviewMatrixSectionProps & { flat?: boolean }> = ({
  points,
  activePointId,
  onHoverPoint,
  onSelectPoint,
  flat = false
}) => (
  <ScatterPlotChart
    title=""
    subtitle={null}
    xLabel="學生人數 (萬人)"
    yLabel="全國佔比變動率 (%)"
    points={points}
    activePointId={activePointId}
    onHoverPoint={onHoverPoint}
    onSelectPoint={onSelectPoint}
    className="matrix-chart-premium"
    flat={flat}
  />
)

export default OverviewMatrixSection
