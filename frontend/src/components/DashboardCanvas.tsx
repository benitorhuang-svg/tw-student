import type { ReactNode, RefObject } from 'react'

import CountyTabPanel from './CountyTabPanel'
import InsightPanel from './InsightPanel'
import RegionalTabPanel from './RegionalTabPanel'
import SchoolDetailPanel from './SchoolDetailPanel'
import StackedAreaTrendChart from './StackedAreaTrendChart'
import ScatterPlotChart from './ScatterPlotChart'
import TreemapChart from './TreemapChart'
import AtlasTabs from './AtlasTabs'
import DashboardYearNavigator from './DashboardYearNavigator'
import type { AtlasTab } from '../hooks/useAtlasQueryState'
import type { useAtlasDerivedState } from '../hooks/useAtlasDerivedState'
import type { AcademicYear, CountySchoolAtlasDataset, ManagementTypeFilter, RegionGroupFilter } from '../data/educationData'
import type { TrendPoint } from '../lib/analytics.types'
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
  countySchoolAtlasError: string | null
  selectedCountyId: string | null
  selectedTownshipId: string | null
  countySchoolAtlasCache: Record<string, CountySchoolAtlasDataset>
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
  onSetActiveYear: (year: AcademicYear) => void
  onSetIsYearPlaybackActive: (active: boolean) => void
  summaryYears: number[]
  nationalEducationTrendSeries: Array<{ label: string, points: TrendPoint[] }>
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
  countySchoolAtlasError,
  selectedCountyId,
  selectedTownshipId,
  countySchoolAtlasCache,
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
  onSetActiveYear,
  onSetIsYearPlaybackActive,
  summaryYears,
  nationalEducationTrendSeries,
}: DashboardCanvasProps) {
  const visibleCountyRows = derived.countySummaries.filter((row) => !row.filteredOut)
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

  const overviewTreemapGroups = ['北部', '中部', '南部', '東部', '離島']
    .map((regionName, index) => {
      const regionCounties = visibleCountyRows.filter((row) => row.region === regionName)
      const students = regionCounties.reduce((sum, row) => sum + row.students, 0)

      return {
        id: regionName,
        label: regionName,
        value: students,
        accentColor: `var(--chart-series-${index})`,
        children: regionCounties.map((row) => ({
          id: row.id,
          label: row.shortLabel,
          value: row.students,
          meta: `${row.deltaRatio >= 0 ? '+' : ''}${(row.deltaRatio * 100).toFixed(1)}%`,
        })),
      }
    })
    .filter((group) => group.children.length > 0)


  const overviewMatrixSection = (
    <section className="dashboard-card dashboard-card--matrix">
      <div className="dashboard-card__body dashboard-card__insight-body">
        <div className="atlas-storyboard__chart atlas-storyboard__chart--flush">
          <ScatterPlotChart
            title="發展熱點分析矩陣"
            subtitle="縣市學生人數分布，圓點越大代表學生總數越多"
            xLabel="學生數 (萬人)"
            yLabel="全國佔比變動率 (%)"
            points={derived.countyRankingRows.map((row) => ({
              id: row.id,
              label: row.label,
              x: row.students,
              y: (row.delta / Math.max(derived.currentScope.students, 1)) * 100,
              size: row.schools,
            }))}
            activePointId={hoveredCountyId ?? selectedCountyId}
            onHoverPoint={(id) => {
              setHoveredCountyId(id)
              handlePrefetchCounty(id)
            }}
            onSelectPoint={scenarioActions.handleCountySelect}
          >
            <DashboardYearNavigator
              activeYear={activeYear}
              isYearPlaybackActive={isYearPlaybackActive}
              summaryYears={summaryYears}
              onSetActiveYear={onSetActiveYear}
              onTogglePlayback={() => onSetIsYearPlaybackActive(!isYearPlaybackActive)}
            />
          </ScatterPlotChart>
        </div>
      </div>
    </section>
  )

  const overviewTrendSection = (
    <section className="dashboard-card dashboard-card--overview-story">
      <div className="dashboard-card__body dashboard-card__insight-body">
        <StackedAreaTrendChart
          title="全台各學制歷年學生數"
          subtitle="聚焦少子化衝擊全台總量與學制波浪趨勢"
          series={nationalEducationTrendSeries}
        />
      </div>
    </section>
  )


  const overviewRankingSection = (
    <section className="dashboard-card dashboard-card--overview-movers">
      <div className="dashboard-card__body dashboard-card__insight-body">
        <div className="atlas-storyboard__split">
          <div className="atlas-storyboard__chart">
            <div className="panel-heading panel-heading--section">
              <div className="panel-heading__stack">
                <p className="eyebrow eyebrow--cyan">下鑽入口</p>
                <h3>{derived.selectedCounty?.name ? `${derived.selectedCounty.name} 鄉鎮排行` : '全台縣市排行'}</h3>
              </div>
              <p className="panel-heading__meta">{derived.selectedCounty?.name ? '點擊鄉鎮即可同步切換至鄉鎮範圍' : '點選縣市列，地圖將展開下鑽'}</p>
            </div>
            <InsightPanel
              title=""
              subtitle=""
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

          <div className="atlas-storyboard__chart">
            <div className="panel-heading panel-heading--section">
              <div className="panel-heading__stack">
                <p className="eyebrow">變動焦點</p>
                <h3>年度增幅異動</h3>
              </div>
              <p className="panel-heading__meta">先看增減幅度最大的縣市，再點擊進入縣市分析</p>
            </div>
            <InsightPanel
              title=""
              subtitle=""
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
  )

  const overviewTreemapSection = (
    <section className="dashboard-card dashboard-card--overview-treemap">
      <div className="dashboard-card__body dashboard-card__insight-body">
        <TreemapChart
          title="全台區域與縣市量體"
          subtitle="先看區域板塊，再往縣市量體下鑽；面積愈大代表目前學生總量愈高。"
          groups={overviewTreemapGroups}
          activeLeafId={selectedCountyId}
          onSelectLeaf={scenarioActions.handleCountySelect}
          onSelectGroup={(nextRegion) => scenarioActions.handleRegionSelect(nextRegion as RegionGroupFilter)}
        />
      </div>
    </section>
  )

  return (
    <main className={`dashboard-canvas dashboard-canvas--${activeTab}`}>
      <section className="dashboard-card dashboard-card--map">
        <div className="dashboard-card__body dashboard-card__map-body">
          {mapElement}
        </div>
      </section>

      <section className="dashboard-side-shell" ref={sidebarRef}>
        <AtlasTabs
          activeTab={activeTab}
          items={desktopTabItems.map(item => ({ key: item.id, label: item.label }))}
          onSelectTab={setActiveTab}
        />

        {activeTab === 'overview' ? (
          <div className="dashboard-side-shell__content dashboard-side-shell__content--overview">
            {/* 原子版面排列：您可在此直接調整大區塊的順序 */}
            {overviewTrendSection}
            {overviewMatrixSection}
            {overviewTreemapSection}
            {overviewRankingSection}
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
                  selectedCountySchoolAtlas={derived.activeCountyId ? countySchoolAtlasCache[derived.activeCountyId] ?? null : null}
                  isCountySchoolAtlasLoading={derived.activeCountyId ? !countySchoolAtlasCache[derived.activeCountyId] && !countySchoolAtlasError : false}
                  countySchoolAtlasError={countySchoolAtlasError}
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
