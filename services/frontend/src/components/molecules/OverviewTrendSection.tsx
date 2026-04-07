import { StackedAreaTrendChart } from '../organisms/StackedAreaTrendChart'
import type { TrendPoint } from '../../lib/analytics.types'
import '../../styles/organisms/overview-sections-redesign.css'

type OverviewTrendSectionProps = {
  series: Array<{ label: string, points: TrendPoint[] }>
}

/**
 * Molecule: OverviewTrendSection
 */
export const OverviewTrendSection: React.FC<OverviewTrendSectionProps & { flat?: boolean }> = ({ series }) => (
  <StackedAreaTrendChart
    title=""
    subtitle={null}
    series={series}
    className="dashboard-card--overview-story"
    showHeader={false}
    flat={true}
  />
)

export default OverviewTrendSection
