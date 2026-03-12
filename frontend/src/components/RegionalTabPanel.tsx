import { useMemo } from 'react'

import ButterflyChart from './ButterflyChart'
import ComparisonBarChart from './ComparisonBarChart'
import ComparisonPanel from './ComparisonPanel'
import InsightPanel from './InsightPanel'
import ScopePanel from './ScopePanel'
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
      <ScopePanel
        scopePath={derived.scopePath}
        scopeHeadline={derived.scopeHeadline}
        scopeDescription={derived.scopeDescription}
        currentScope={derived.currentScope}
        activeYear={activeYear}
        isYearPlaybackActive={isYearPlaybackActive}
        educationDistribution={derived.educationDistribution}
        flat={true}
        className="dashboard-card--kpi"
      />

      <section className="dashboard-card dashboard-card--regional-story">
        <div className="dashboard-card__head">
          <div className="panel-heading__stack">
            <h3 className="dashboard-card__title">{region === '全部' ? '全台四大區域板塊分佈' : `${region} 結構快照`}</h3>
            <p className="dashboard-card__subtitle">區域學生規模與增減率概況</p>
          </div>
        </div>

        <div className="dashboard-card__body dashboard-card__insight-body">

          <div className="atlas-metric-strip atlas-metric-strip--spaced">
            {regionSummaries.map((item) => (
              <article key={item.id} className={region === item.id ? 'atlas-metric-tile atlas-metric-tile--interactive atlas-metric-tile--active' : 'atlas-metric-tile atlas-metric-tile--interactive'} onClick={() => scenarioActions.handleRegionSelect(item.id as RegionGroupFilter)}>
                <span>{item.label}</span>
                <strong>{formatStudents(item.students)} 人</strong>
                <small>{item.countyCount} 縣市 / 年增減 {formatPercent(item.deltaRatio)}</small>
              </article>
            ))}
          </div>

          <div className="atlas-storyboard__split">
            <div className="atlas-storyboard__chart">
              <ComparisonBarChart
                items={regionSummaries.map((item) => ({ id: item.id, label: item.label, value: item.students }))}
                activeItemId={region === '全部' ? null : region}
                onSelectItem={(regionId) => scenarioActions.handleRegionSelect(regionId as RegionGroupFilter)}
                flat={true}
              />
            </div>
            <div className="atlas-storyboard__chart">
              <ButterflyChart
                items={regionSummaries.map((item) => ({
                  id: item.id,
                  label: item.label,
                  leftLabel: '公立',
                  rightLabel: '私立',
                  leftValue: item.publicStudents,
                  rightValue: item.privateStudents,
                }))}
                activeItemId={region === '全部' ? null : region}
                onSelectItem={(regionId) => scenarioActions.handleRegionSelect(regionId as RegionGroupFilter)}
                flat={true}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-card dashboard-card--ranking">
        <div className="dashboard-card__head">
          <div className="panel-heading__stack">
            <h3 className="dashboard-card__title">{region === '全部' ? '全台縣市聚焦' : `${region} 縣市落差`}</h3>
            <p className="dashboard-card__subtitle">行政區域排行與圖表切換</p>
          </div>

          <div className="dashboard-card__actions">
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
          </div>
        </div>

        <div className="dashboard-card__body dashboard-card__ranking-body">
          {regionalChartView === 'comparison' ? (
            <ComparisonBarChart items={derived.countySummaries.filter((row) => !row.filteredOut).slice(0, 8).map((row) => ({ id: row.id, label: row.shortLabel, value: row.students }))} activeItemId={hoveredCountyId ?? selectedCountyId} onHoverItem={setHoveredCountyId} onSelectItem={scenarioActions.handleCountySelect} />
          ) : (
            <InsightPanel
              title={region === '全部' ? '全台縣市排行' : `${region} 縣市排行`}
              subtitle="依照學生人數"
              showHeader={true}
              rows={derived.countySummaries.filter((row) => !row.filteredOut).map((row) => ({ id: row.id, label: row.name, subLabel: row.region, students: row.students, schools: row.schools, delta: row.delta, deltaRatio: row.deltaRatio, trend: row.trend }))}
              activeRowId={selectedCountyId}
              onSelectRow={scenarioActions.handleCountySelect}
              onHoverRow={(rowId) => {
                setHoveredCountyId(rowId)
                handlePrefetchCounty(rowId)
              }}
              emptyMessage="目前區域條件沒有可比較的縣市資料。"
              flat={true}
            />
          )}
        </div>
      </section>

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
        flat={true}
        className="dashboard-card--comparison"
      />
    </div>
  )
}

export default RegionalTabPanel
