import { useMemo } from 'react'

import ComparisonBarChart from './ComparisonBarChart'
import ComparisonPanel from './ComparisonPanel'
import InsightPanel from './InsightPanel'
import ScopePanel from './ScopePanel'
import StackedShareBarChart from './StackedShareBarChart'
import type { useAtlasDerivedState } from '../hooks/useAtlasDerivedState'
import type { AcademicYear, RegionGroupFilter } from '../data/educationData'
import { formatPercent, formatStudents } from '../lib/analytics'
import type { InvestigationItem, SavedComparisonScenario } from '../hooks/types'

type RegionalTabPanelProps = {
  derived: ReturnType<typeof useAtlasDerivedState>
  activeYear: AcademicYear
  isYearPlaybackActive: boolean
  region: RegionGroupFilter
  comparisonScenarioName: string
  setComparisonScenarioName: (name: string) => void
  favoriteScenarios: SavedComparisonScenario[]
  recentScenarios: SavedComparisonScenario[]
  activeScenarioSnapshot: SavedComparisonScenario | null
  copyFeedbackMessage: string | null
  scenarioFeedbackMessage: string | null
  regionalChartView: 'comparison' | 'ranking'
  setRegionalChartView: (view: 'comparison' | 'ranking') => void
  hoveredCountyId: string | null
  selectedCountyId: string | null
  setHoveredCountyId: (id: string | null) => void
  scenarioActions: {
    handleRegionSelect: (region: RegionGroupFilter) => void
    handleCountySelect: (countyId: string) => void
    toggleComparisonCounty: (countyId: string) => void
    handleCopyComparisonLink: () => Promise<void>
    handleSaveFavoriteScenario: () => void
    handleExportFavoriteScenarios: () => void
    handleImportFavoriteScenarios: (event: React.ChangeEvent<HTMLInputElement>) => void
    applySavedScenario: (scenario: SavedComparisonScenario) => void
    handleTogglePinScenario: (scenarioId: string) => void
    handleRenameFavoriteScenario: (scenarioId: string) => void
    handleRemoveFavoriteScenario: (scenarioId: string) => void
    favoriteScenarioIds: Set<string>
    handleDownloadInvestigation: (item: InvestigationItem) => void
    handleDownloadAllInvestigations: () => void
  }
  handlePrefetchCounty: (countyId: string | null) => void
}

function RegionalTabPanel({
  derived,
  activeYear,
  isYearPlaybackActive,
  region,
  comparisonScenarioName,
  setComparisonScenarioName,
  favoriteScenarios,
  recentScenarios,
  activeScenarioSnapshot,
  copyFeedbackMessage,
  scenarioFeedbackMessage,
  regionalChartView,
  setRegionalChartView,
  hoveredCountyId,
  selectedCountyId,
  setHoveredCountyId,
  scenarioActions,
  handlePrefetchCounty,
}: RegionalTabPanelProps) {
  const regionSummaries = useMemo(() => [...derived.regionalComparisonRows].sort((left, right) => right.students - left.students), [derived.regionalComparisonRows])

  return (
    <div className="dashboard-side-shell__content dashboard-side-shell__content--regional">
      <section className="dashboard-card dashboard-card--kpi">
        <div className="dashboard-card__body dashboard-card__summary-body">
          <ScopePanel
            scopePath={derived.scopePath}
            scopeHeadline={derived.scopeHeadline}
            scopeDescription={derived.scopeDescription}
            currentScope={derived.currentScope}
            activeYear={activeYear}
            isYearPlaybackActive={isYearPlaybackActive}
            educationDistribution={derived.educationDistribution}
          />
        </div>
      </section>

      <section className="dashboard-card dashboard-card--regional-story">
        <div className="dashboard-card__body dashboard-card__insight-body">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">區域量體</p>
              <h3>{region === '全部' ? '全台區域分布' : `${region} 量體快照`}</h3>
            </div>
            <p className="panel-heading__meta">先用區域量體切地圖範圍，再往下比較區域內縣市差異。</p>
          </div>

          <div className="atlas-metric-strip">
            {regionSummaries.map((item) => (
              <article key={item.id} className={region === item.id ? 'atlas-metric-tile atlas-metric-tile--active' : 'atlas-metric-tile'}>
                <span>{item.label}</span>
                <strong>{formatStudents(item.students)} 人</strong>
                <small>{item.countyCount} 縣市 / 年增減 {formatPercent(item.delta / Math.max(item.students - item.delta, 1))}</small>
              </article>
            ))}
          </div>

          <ComparisonBarChart
            items={regionSummaries.map((item) => ({ id: item.id, label: item.label, value: item.students }))}
            activeItemId={region === '全部' ? null : region}
            onSelectItem={(regionId) => scenarioActions.handleRegionSelect(regionId as RegionGroupFilter)}
          />

          <StackedShareBarChart
            title="各區公私立學生占比"
            subtitle="輔圖改看公私立結構，避免區域分析只剩總量比較。"
            items={regionSummaries.map((item) => ({
              id: item.id,
              label: item.label,
              total: item.publicStudents + item.privateStudents,
              segments: [
                { label: '公立', value: item.publicStudents, share: item.publicShare, color: 'linear-gradient(90deg, #2563eb, #38bdf8)' },
                { label: '私立', value: item.privateStudents, share: item.privateShare, color: 'linear-gradient(90deg, #f97316, #fb7185)' },
              ],
            }))}
            activeItemId={region === '全部' ? null : region}
            onSelectItem={(regionId) => scenarioActions.handleRegionSelect(regionId as RegionGroupFilter)}
          />
        </div>
      </section>

      <section className="dashboard-card dashboard-card--comparison">
        <div className="dashboard-card__body dashboard-card__insight-body">
          <ComparisonPanel
            comparisonScenarioName={comparisonScenarioName}
            onChangeScenarioName={setComparisonScenarioName}
            effectiveComparisonCountyIds={derived.effectiveComparisonCountyIds}
            comparisonCandidates={derived.comparisonCandidates}
            comparisonSummaries={derived.comparisonSummaries}
            favoriteScenarios={favoriteScenarios}
            recentScenarios={recentScenarios}
            activeScenarioSnapshot={activeScenarioSnapshot}
            favoriteScenarioIds={scenarioActions.favoriteScenarioIds}
            copyFeedback={copyFeedbackMessage}
            scenarioFeedback={scenarioFeedbackMessage}
            onToggleCounty={scenarioActions.toggleComparisonCounty}
            onCopyLink={scenarioActions.handleCopyComparisonLink}
            onSaveScenario={scenarioActions.handleSaveFavoriteScenario}
            onExportScenarios={scenarioActions.handleExportFavoriteScenarios}
            onImportScenarios={scenarioActions.handleImportFavoriteScenarios}
            onApplyScenario={scenarioActions.applySavedScenario}
            onTogglePinScenario={scenarioActions.handleTogglePinScenario}
            onRenameScenario={scenarioActions.handleRenameFavoriteScenario}
            onRemoveScenario={scenarioActions.handleRemoveFavoriteScenario}
          />
        </div>
      </section>

      <section className="dashboard-card dashboard-card--ranking">
        <div className="dashboard-card__body dashboard-card__ranking-body">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">區域對照</p>
              <h3>{region === '全部' ? '全台縣市比較' : `${region} 各縣市聚焦`}</h3>
            </div>
            <p className="panel-heading__meta">先看區域年度趨勢，再用排行與長條比較掌握縣市落差。</p>
          </div>
          <div className="chart-pill-row" role="tablist" aria-label="區域分析圖表切換">
            <button
              type="button"
              role="tab"
              aria-selected={regionalChartView === 'comparison'}
              className={regionalChartView === 'comparison' ? 'chip chip--active' : 'chip'}
              onClick={() => setRegionalChartView('comparison')}
            >
              縣市量體
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={regionalChartView === 'ranking'}
              className={regionalChartView === 'ranking' ? 'chip chip--active' : 'chip'}
              onClick={() => setRegionalChartView('ranking')}
            >
              縣市排行
            </button>
          </div>
          {regionalChartView === 'comparison' ? (
            <ComparisonBarChart items={derived.countySummaries.filter((row) => !row.filteredOut).slice(0, 8).map((row) => ({ id: row.id, label: row.shortLabel, value: row.students }))} activeItemId={hoveredCountyId ?? selectedCountyId} onHoverItem={setHoveredCountyId} onSelectItem={scenarioActions.handleCountySelect} />
          ) : (
            <InsightPanel
              title={region === '全部' ? '全台縣市排行' : `${region} 縣市排行`}
              subtitle="點擊縣市可直接進入縣市分析"
              showHeader={false}
              rows={derived.countySummaries.filter((row) => !row.filteredOut).map((row) => ({ id: row.id, label: row.name, subLabel: row.region, students: row.students, schools: row.schools, delta: row.delta, deltaRatio: row.deltaRatio, trend: row.trend }))}
              activeRowId={selectedCountyId}
              onSelectRow={scenarioActions.handleCountySelect}
              onHoverRow={(rowId) => {
                setHoveredCountyId(rowId)
                handlePrefetchCounty(rowId)
              }}
              emptyMessage="目前區域條件沒有可比較的縣市資料。"
            />
          )}
        </div>
      </section>
    </div>
  )
}

export default RegionalTabPanel
