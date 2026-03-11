import PieChart from './PieChart'
import StatCard from './StatCard'
import TrendChart from './TrendChart'
import { formatAcademicYear, formatDelta, formatPercent, formatStudents, type TrendPoint } from '../lib/analytics'
import type { AcademicYear } from '../hooks/types'

type ScopeSummary = {
  label: string
  students: number
  schools: number
  delta: number
  deltaRatio: number
  trend: TrendPoint[]
}

type EducationDistRow = {
  level: string
  students: number
  share: number
}

type ObservedCounty = {
  id: string
  name: string
}

type ScopePanelProps = {
  scopePath: string[]
  scopeHeadline: string
  scopeDescription: string
  currentScope: ScopeSummary
  activeYear: AcademicYear
  isYearPlaybackActive: boolean
  educationDistribution: EducationDistRow[]
  observedCounties?: ObservedCounty[]
  topCountyPrefetchIds?: string
  loadObservation?: unknown
  offlineReadyWithBuckets?: number
  onPrefetchAll?: () => void
}

function ScopePanel({
  currentScope,
  activeYear,
  educationDistribution,
}: ScopePanelProps) {

  return (
    <section className="panel scope-panel">
      <div className="stat-grid stat-grid--top stat-grid--cols-2">
        <div data-testid="current-scope-card">
          <StatCard
            title={currentScope.label}
            value={`${formatStudents(currentScope.students)} 人`}
            numericValue={currentScope.students}
            caption={`${currentScope.schools.toLocaleString('zh-TW')} 校 | 今年增減 ${formatDelta(currentScope.delta)} / ${formatPercent(currentScope.deltaRatio)}`}
            tone="lagoon"
          />
        </div>
        <StatCard
          title="今年增減"
          value={`${currentScope.delta >= 0 ? '+' : ''}${formatStudents(currentScope.delta)} 人`}
          numericValue={currentScope.delta}
          caption={`${formatAcademicYear(activeYear)} 相較前一年 ${formatPercent(currentScope.deltaRatio)}`}
          tone="sun"
        />
      </div>

      <div className="scope-panel__visuals">
        <div className="scope-panel__visual-card">
          <p className="eyebrow">教育階段分布</p>
          <PieChart slices={educationDistribution.map((row) => ({ label: row.level, value: row.students, share: row.share }))} size={108} centerLabel="學生總數" />
        </div>

        <div className="scope-panel__visual-card scope-panel__visual-card--trend">
          <TrendChart
            chartId="scope-trend"
            title={`${currentScope.label} 歷年學生數`}
            subtitle={formatAcademicYear(activeYear)}
            points={currentScope.trend}
            activeYear={activeYear}
            showHeader={false}
          />
        </div>
      </div>
    </section>
  )
}

export default ScopePanel
