import React from 'react'
import StackedAreaTrendChart from '../StackedAreaTrendChart'
import type { TrendPoint } from '../../lib/analytics.types'

type OverviewTrendSectionProps = {
  series: Array<{ label: string, points: TrendPoint[] }>
}

/**
 * Molecule: OverviewTrendSection
 */
export const OverviewTrendSection: React.FC<OverviewTrendSectionProps & { flat?: boolean }> = ({ series, flat = false }) => (
  <StackedAreaTrendChart
    title="全台各級學制歷年學生人數"
    subtitle={undefined}
    series={series}
    className="dashboard-card--overview-story dashboard-card--premium"
    showHeader={false}
    flat={flat}
  >
    <p className="dashboard-card__subtitle" style={{ margin: 0, opacity: 0.8 }}>
      顯示自 108 學年度起，不同教育階段的整體學生人數走勢
    </p>
  </StackedAreaTrendChart>
)

export default OverviewTrendSection
