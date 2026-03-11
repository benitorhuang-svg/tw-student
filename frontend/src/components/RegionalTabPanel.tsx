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
          <div className="panel-heading" style={{ marginBottom: '16px' }}>
            <div>
              <p className="eyebrow" style={{ color: 'var(--palette-cyan)' }}>區域結構剖析</p>
              <h3>{region === '全部' ? '全台四大區域板塊分布' : `${region} 結構快照`}</h3>
            </div>
            <p className="panel-heading__meta">上方卡片為區域彙整，點選可過濾地圖；下方圖表則探索公私立佔比結構。</p>
          </div>

          <div className="atlas-metric-strip" style={{ marginBottom: '16px' }}>
            {regionSummaries.map((item) => (
              <article key={item.id} className={region === item.id ? 'atlas-metric-tile atlas-metric-tile--active' : 'atlas-metric-tile'} style={{ cursor: 'pointer', transition: 'all 0.2s ease' }} onClick={() => scenarioActions.handleRegionSelect(item.id as RegionGroupFilter)}>
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
              />
            </div>
            <div className="atlas-storyboard__chart">
              <ButterflyChart
                title="各區公私立學生占比"
                subtitle="左右對照各區公私立量體，快速辨識依賴公部門或民間補位的區域結構。"
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
              />
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-card dashboard-card--ranking">
        <div className="dashboard-card__body dashboard-card__ranking-body">
          <div className="panel-heading" style={{ marginBottom: '16px' }}>
            <div>
              <p className="eyebrow" style={{ color: 'var(--palette-brass)' }}>下鑽入口</p>
              <h3>{region === '全部' ? '全台縣市聚焦' : `${region} 縣市落差`}</h3>
            </div>
            <p className="panel-heading__meta">點選列表中的縣市，地圖將自動切換並進入該縣市分析。右上方可切換顯示量體長條或詳細排行。</p>
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
              subtitle=""
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

      <section className="dashboard-card dashboard-card--comparison">
        <div className="dashboard-card__body dashboard-card__insight-body">
          <div className="panel-heading" style={{ marginBottom: '16px' }}>
            <div>
              <p className="eyebrow">自帶分析台</p>
              <h3>自訂縣市對焦</h3>
            </div>
            <p className="panel-heading__meta">在左側地圖多選縣市，或是使用上方的自訂群組，比較沒有被行政區界線綁定的客製化趨勢。</p>
          </div>
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
    </div>
  )
}

export default RegionalTabPanel
