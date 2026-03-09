import { useState, type ReactNode, type RefObject } from 'react'

import CountyTabPanel from './CountyTabPanel'
import ComparisonBarChart from './ComparisonBarChart'
import InsightPanel from './InsightPanel'
import RegionalTabPanel from './RegionalTabPanel'
import SchoolDetailPanel from './SchoolDetailPanel'
import ScopePanel from './ScopePanel'
import StackedAreaTrendChart from './StackedAreaTrendChart'
import type { AtlasTab } from '../hooks/useAtlasQueryState'
import type { useAtlasDerivedState } from '../hooks/useAtlasDerivedState'
import type { AcademicYear, ManagementTypeFilter, RegionGroupFilter } from '../data/educationData'
import type { InvestigationItem, SavedComparisonScenario } from '../hooks/types'

type DashboardCanvasProps = {
  activeTab: AtlasTab
  sidebarRef: RefObject<HTMLElement | null>
  desktopTabItems: Array<{ id: AtlasTab; label: string }>
  setActiveTab: (tab: AtlasTab) => void
  mapElement: ReactNode

  // Scope / KPI
  derived: ReturnType<typeof useAtlasDerivedState>

  // Filters
  activeYear: AcademicYear
  isYearPlaybackActive: boolean
  managementType: ManagementTypeFilter
  region: RegionGroupFilter

  // Comparison / scenario
  comparisonScenarioName: string
  setComparisonScenarioName: (name: string) => void
  favoriteScenarios: SavedComparisonScenario[]
  recentScenarios: SavedComparisonScenario[]
  activeScenarioSnapshot: SavedComparisonScenario | null
  copyFeedbackMessage: string | null
  scenarioFeedbackMessage: string | null

  // School detail
  countyDetailError: string | null
  selectedCountyId: string | null
  selectedTownshipId: string | null
  schoolWorkbenchView: 'list' | 'analysis' | 'notes'
  onSetSchoolWorkbenchView: (view: 'list' | 'analysis' | 'notes') => void

  // Hover
  hoveredCountyId: string | null
  hoveredTownshipId: string | null
  hoveredSchoolId: string | null
  setHoveredCountyId: (id: string | null) => void
  setHoveredTownshipId: (id: string | null) => void

  // Chart views
  regionalChartView: 'comparison' | 'ranking'
  countyChartView: 'comparison' | 'ranking'
  setRegionalChartView: (view: 'comparison' | 'ranking') => void
  setCountyChartView: (view: 'comparison' | 'ranking') => void

  // Actions
  scenarioActions: {
    handleRegionSelect: (region: RegionGroupFilter) => void
    handleCountySelect: (countyId: string) => void
    handleTownshipSelect: (townshipId: string) => void
    handleResetScope: () => void
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
  handleSchoolSelect: (schoolId: string | null) => void
  onHoverSchool?: (schoolId: string | null) => void
}

function DashboardCanvas({
  activeTab,
  sidebarRef,
  desktopTabItems,
  setActiveTab,
  mapElement,
  derived,
  activeYear,
  isYearPlaybackActive,
  managementType,
  region,
  comparisonScenarioName,
  setComparisonScenarioName,
  favoriteScenarios,
  recentScenarios,
  activeScenarioSnapshot,
  copyFeedbackMessage,
  scenarioFeedbackMessage,
  countyDetailError,
  selectedCountyId,
  selectedTownshipId,
  schoolWorkbenchView,
  onSetSchoolWorkbenchView,
  hoveredCountyId,
  hoveredTownshipId,
  hoveredSchoolId,
  setHoveredCountyId,
  setHoveredTownshipId,
  regionalChartView,
  countyChartView,
  setRegionalChartView,
  setCountyChartView,
  scenarioActions,
  handlePrefetchCounty,
  handleSchoolSelect,
  onHoverSchool,
}: DashboardCanvasProps) {
  const [overviewChartView, setOverviewChartView] = useState<'students' | 'schools' | 'density'>('students')

  const visibleCountyRows = derived.countySummaries.filter((row) => !row.filteredOut)
  const overviewChartItems = [...visibleCountyRows]
    .sort((left, right) => {
      const leftValue = overviewChartView === 'students'
        ? left.students
        : overviewChartView === 'schools'
          ? left.schools
          : Math.round(left.students / Math.max(left.schools, 1))
      const rightValue = overviewChartView === 'students'
        ? right.students
        : overviewChartView === 'schools'
          ? right.schools
          : Math.round(right.students / Math.max(right.schools, 1))
      return rightValue - leftValue
    })
    .slice(0, 8)
    .map((row) => ({
      id: row.id,
      label: row.shortLabel,
      value: overviewChartView === 'students'
        ? row.students
        : overviewChartView === 'schools'
          ? row.schools
          : Math.round(row.students / Math.max(row.schools, 1)),
    }))
  const overviewTrendRows = [...visibleCountyRows]
    .sort((left, right) => Math.abs(right.deltaRatio) - Math.abs(left.deltaRatio))
    .slice(0, 8)
    .map((row) => ({
      id: row.id,
      label: row.name,
      subLabel: row.region,
      students: row.students,
      schools: row.schools,
      delta: row.delta,
      deltaRatio: row.deltaRatio,
      trend: row.trend,
    }))

  return (
    <main className={`dashboard-canvas dashboard-canvas--${activeTab}`}>
      <section className="dashboard-card dashboard-card--map">
        <div className="dashboard-card__body dashboard-card__map-body">
          {mapElement}
        </div>
      </section>

      <section className="dashboard-side-shell" ref={sidebarRef}>
        <nav className="dashboard-side-shell__tabs" aria-label="右側分析分頁">
          {desktopTabItems.map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              className={activeTab === tabItem.id ? 'dashboard-tab dashboard-tab--active' : 'dashboard-tab'}
              onClick={() => setActiveTab(tabItem.id)}
            >
              {tabItem.label}
            </button>
          ))}
        </nav>

        {activeTab === 'overview' ? (
          <div className="dashboard-side-shell__content dashboard-side-shell__content--overview">
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

            <section className="dashboard-card dashboard-card--ranking">
              <div className="dashboard-card__body dashboard-card__ranking-body">
                <InsightPanel
                  title={derived.selectedCounty?.name ? `${derived.selectedCounty.name} 鄉鎮排行` : '全台縣市排行'}
                  subtitle={derived.selectedCounty?.name ? '點擊鄉鎮即可同步切換' : '點擊縣市即可同步縮小左側地圖範圍'}
                  showHeader={false}
                  rows={derived.topRows}
                  activeRowId={selectedTownshipId ?? selectedCountyId}
                  onSelectRow={(rowId: string) => {
                    if (derived.selectedCounty?.name) {
                      scenarioActions.handleTownshipSelect(rowId)
                      return
                    }
                    scenarioActions.handleCountySelect(rowId)
                  }}
                  onHoverRow={(rowId: string | null) => {
                    setHoveredCountyId(rowId)
                    if (!derived.selectedCounty?.name && rowId) {
                      handlePrefetchCounty(rowId)
                      return
                    }
                    handlePrefetchCounty(null)
                  }}
                  emptyMessage="目前條件沒有可顯示的排行資料。"
                />
              </div>
            </section>

            <section className="dashboard-card dashboard-card--overview-story">
              <div className="dashboard-card__body dashboard-card__insight-body">
                <StackedAreaTrendChart
                  title="全台各學制歷年學生數"
                  subtitle="主圖聚焦全台總量趨勢，甜甜圈與 KPI 則補足當年結構與規模。"
                  series={derived.nationalEducationTrendSeries}
                  activeYear={activeYear}
                />
              </div>
            </section>

            <section className="dashboard-card dashboard-card--overview-movers">
              <div className="dashboard-card__body dashboard-card__insight-body">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">全台熱區</p>
                    <h3>縣市量體與年度變動</h3>
                  </div>
                  <p className="panel-heading__meta">輔圖保留熱區與變動排序，方便從全台總覽直接下鑽到縣市分析。</p>
                </div>

                <div className="chart-pill-row" role="tablist" aria-label="全台總覽圖表切換">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={overviewChartView === 'students'}
                    className={overviewChartView === 'students' ? 'chip chip--active' : 'chip'}
                    onClick={() => setOverviewChartView('students')}
                  >
                    學生熱點
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={overviewChartView === 'schools'}
                    className={overviewChartView === 'schools' ? 'chip chip--active' : 'chip'}
                    onClick={() => setOverviewChartView('schools')}
                  >
                    學校量體
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={overviewChartView === 'density'}
                    className={overviewChartView === 'density' ? 'chip chip--active' : 'chip'}
                    onClick={() => setOverviewChartView('density')}
                  >
                    平均每校
                  </button>
                </div>

                <div className="atlas-storyboard__split">
                  <div className="atlas-storyboard__chart">
                    <ComparisonBarChart
                      items={overviewChartItems}
                      activeItemId={hoveredCountyId ?? selectedCountyId}
                      onHoverItem={(rowId) => {
                        setHoveredCountyId(rowId)
                        handlePrefetchCounty(rowId)
                      }}
                      onSelectItem={scenarioActions.handleCountySelect}
                    />
                  </div>
                  <div className="atlas-storyboard__chart">
                    <InsightPanel
                      title="年度變動焦點"
                      subtitle="先看增減幅度最大的縣市，再點擊進入縣市分析。"
                      showHeader={false}
                      rows={overviewTrendRows}
                      activeRowId={selectedCountyId}
                      onSelectRow={scenarioActions.handleCountySelect}
                      onHoverRow={(rowId: string | null) => {
                        setHoveredCountyId(rowId)
                        handlePrefetchCounty(rowId)
                      }}
                      emptyMessage="目前條件沒有可顯示的縣市變動資料。"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'regional' ? (
          <RegionalTabPanel
            derived={derived}
            activeYear={activeYear}
            isYearPlaybackActive={isYearPlaybackActive}
            region={region}
            comparisonScenarioName={comparisonScenarioName}
            setComparisonScenarioName={setComparisonScenarioName}
            favoriteScenarios={favoriteScenarios}
            recentScenarios={recentScenarios}
            activeScenarioSnapshot={activeScenarioSnapshot}
            copyFeedbackMessage={copyFeedbackMessage}
            scenarioFeedbackMessage={scenarioFeedbackMessage}
            regionalChartView={regionalChartView}
            setRegionalChartView={setRegionalChartView}
            hoveredCountyId={hoveredCountyId}
            selectedCountyId={selectedCountyId}
            setHoveredCountyId={setHoveredCountyId}
            scenarioActions={scenarioActions}
            handlePrefetchCounty={handlePrefetchCounty}
          />
        ) : null}

        {activeTab === 'county' ? (
          <CountyTabPanel
            derived={derived}
            activeYear={activeYear}
            isYearPlaybackActive={isYearPlaybackActive}
            managementType={managementType}
            selectedTownshipId={selectedTownshipId}
            countyChartView={countyChartView}
            setCountyChartView={setCountyChartView}
            hoveredTownshipId={hoveredTownshipId}
            setHoveredTownshipId={setHoveredTownshipId}
            onSelectTownship={scenarioActions.handleTownshipSelect}
          />
        ) : null}

        {activeTab === 'schools' || activeTab === 'school-focus' ? (
          <div className="dashboard-side-shell__content dashboard-side-shell__content--schools">
            <section className="dashboard-card dashboard-card--school-detail">
              <div className="dashboard-card__body dashboard-card__insight-body">
                <SchoolDetailPanel
                  selectedCountyName={derived.selectedCounty?.name ?? null}
                  countyDetailError={countyDetailError}
                  isCountyDetailLoading={derived.isCountyDetailLoading}
                  schoolInsights={derived.schoolInsights}
                  countyWideSchoolInsights={derived.countyWideSchoolInsights}
                  selectedSchool={derived.selectedSchool}
                  schoolPanelTitle={activeTab === 'school-focus' && derived.selectedSchool ? derived.selectedSchool.name : derived.schoolPanelTitle}
                  panelMode={activeTab === 'school-focus' ? 'focus' : 'workspace'}
                  activeYear={activeYear}
                  activeWorkbenchView={schoolWorkbenchView}
                  selectedTownshipSummary={derived.selectedTownshipSummary}
                  selectedCountySummary={derived.selectedCountySummary}
                  highlightedSchoolId={hoveredSchoolId}
                  onSetWorkbenchView={onSetSchoolWorkbenchView}
                  onHoverSchool={onHoverSchool}
                  onSelectSchool={handleSchoolSelect}
                />
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default DashboardCanvas
