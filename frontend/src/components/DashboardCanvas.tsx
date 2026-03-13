import { useState } from 'react'
import type { ReactNode, RefObject, TransitionStartFunction } from 'react'
import CountyTabPanel from './CountyTabPanel'
import RegionalTabPanel from './RegionalTabPanel'
import SchoolDetailPanel from './SchoolDetailPanel'
import StackedAreaTrendChart from './StackedAreaTrendChart'
import ScatterPlotChart from './ScatterPlotChart'
import AtlasTabs from './AtlasTabs'
import TreemapChart from './TreemapChart'
import { AtlasPlaybackPill, AtlasLevelPill, AtlasRegionPill, AtlasTypePill } from './AtlasGlobalFilters'
import MapFloatingHelp from './map/molecules/MapFloatingHelp'
import type { AtlasTab } from '../hooks/useAtlasQueryState'
import '../styles/templates/dashboard-shell/01-premium-cards-system.css'
import type { useAtlasDerivedState } from '../hooks/useAtlasDerivedState'
import type { RegionGroupFilter, CountySchoolAtlasDataset, AcademicYear, EducationLevelFilter, ManagementTypeFilter } from '../data/educationData'
import type { TrendPoint } from '../lib/analytics.types'
import type { InvestigationItem, SavedComparisonScenario } from '../hooks/types'

type DashboardCanvasProps = {
  activeTab: AtlasTab
  sidebarRef: RefObject<HTMLDivElement | null>
  desktopTabItems: Array<{ id: AtlasTab; label: string }>
  setActiveTab: (tab: AtlasTab) => void
  mapElement: ReactNode
  header: ReactNode
  footer: ReactNode

  // Scope / KPI
  derived: ReturnType<typeof useAtlasDerivedState>

  // Filters
  activeYear: AcademicYear
  summaryYears: AcademicYear[]
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  region: RegionGroupFilter
  onSetActiveYear: (year: AcademicYear) => void
  onSetEducationLevel: (level: EducationLevelFilter) => void
  onSetManagementType: (type: ManagementTypeFilter) => void

  onStopPlayback: () => void
  onTogglePlayback: () => void
  isYearPlaybackActive: boolean
  startTransition: TransitionStartFunction

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
    handleRegionSelect: (region: RegionGroupFilter, options?: { skipTabSwitch?: boolean }) => void
    handleCountySelect: (countyId: string, options?: { skipTabSwitch?: boolean }) => void;
    handleTownshipSelect: (townshipId: string, options?: { skipTabSwitch?: boolean }) => void
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
  nationalEducationTrendSeries: Array<{ label: string, points: TrendPoint[] }>
}

function DashboardCanvas({
  activeTab,
  sidebarRef,
  desktopTabItems,
  setActiveTab,
  mapElement,
  header,
  footer,
  derived,
  activeYear,
  summaryYears,
  educationLevel,
  managementType,
  region,
  onSetActiveYear,
  onSetEducationLevel,
  onSetManagementType,
  onStopPlayback,
  onTogglePlayback,
  isYearPlaybackActive,
  startTransition,
  countyDetailError,
  selectedCountyId,
  selectedTownshipId,
  onSetSchoolWorkbenchView,
  hoveredCountyId,
  hoveredTownshipId,
  setHoveredCountyId,
  setHoveredTownshipId,
  scenarioActions,
  handlePrefetchCounty,
  handleSchoolSelect,
  onHoverSchool,
  nationalEducationTrendSeries,
}: DashboardCanvasProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    matrix: true,
    trend: false,
    treemap: false
  })

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }))
  }


  const overviewMatrixSection = (
    <ScatterPlotChart
      title="發展熱點分析矩陣"
      subtitle={null}
      xLabel="學生數 (萬人)"
      yLabel="全國佔比變動率 (%)"
      points={derived.countyRankingRows.map((row) => ({
        id: row.id,
        label: row.label,
        x: row.students,
        y: (row.delta / Math.max(derived.globalNationalSummary.students, 1)) * 100,
        size: row.schools,
      }))}
      activePointId={hoveredCountyId ?? selectedCountyId}
      onHoverPoint={(id) => {
        setHoveredCountyId(id)
        handlePrefetchCounty(id)
      }}
      onSelectPoint={(id) => scenarioActions.handleCountySelect(id, { skipTabSwitch: true })}
      showHeader={false}
    >
      <p className="dashboard-card__subtitle" style={{ margin: 0, opacity: 0.8 }}>
        X 軸學生成長，Y 軸全國佔比變動率
      </p>
    </ScatterPlotChart>
  )

  const overviewTrendSection = (
    <StackedAreaTrendChart
      title="全台各學制歷年學生數"
      subtitle={undefined}
      series={nationalEducationTrendSeries}
      className="dashboard-card--overview-story dashboard-card--premium"
      showHeader={false}
    >
       <p className="dashboard-card__subtitle" style={{ margin: 0, opacity: 0.8 }}>
        各教育階段歷年人數變化趨勢
      </p>
    </StackedAreaTrendChart>
  )

  const overviewTreemapSection = (
    <TreemapChart
      title="各地區學生分佈比例"
      subtitle={undefined}
      groups={(() => {
        const regions = ['北部', '中部', '南部', '東部', '離島']
        const regionColors: Record<string, string> = {
          '北部': '#3b82f6',
          '中部': '#10b981',
          '南部': '#f59e0b',
          '東部': '#8b5cf6',
          '離島': '#6366f1'
        }
        
        return regions.map(reg => {
          const counties = derived.countyRankingRows.filter(c => c.subLabel === reg)
          return {
            id: reg,
            label: reg,
            value: counties.reduce((sum, c) => sum + c.students, 0),
            accentColor: regionColors[reg] || '#94a3b8',
            children: counties.map(c => ({
              id: c.id,
              label: c.label,
              value: c.students
            }))
          }
        }).filter(g => g.value > 0)
      })()}
      activeLeafId={hoveredCountyId ?? selectedCountyId}
      onSelectLeaf={(id) => scenarioActions.handleCountySelect(id, { skipTabSwitch: true })}
      className="dashboard-card--premium"
      showHeader={false}
    >
      <p className="dashboard-card__subtitle" style={{ margin: 0, opacity: 0.8 }}>
        以區域為第一層級，探討學生規模構成
      </p>
    </TreemapChart>
  )


  return (
    <main className={`dashboard-canvas dashboard-canvas--${activeTab}`}>
      <section className="dashboard-side-shell">
        <div className="side-shell__header">
          {header}
        </div>

        <div className="side-shell__body" ref={sidebarRef}>
          <AtlasTabs
            activeTab={activeTab}
            items={desktopTabItems.map(item => ({ key: item.id, label: item.label }))}
            onSelectTab={setActiveTab}
          />

          {activeTab === 'overview' ? (
            <div className="dashboard-side-shell__content dashboard-side-shell__content--overview">
              {/* Region selector moved to map floating filters */}
              
              <div className="overview-accordion">
                <div className={`accordion-item ${expandedSections.matrix ? 'accordion-item--expanded' : ''}`}>
                  <button 
                    className="accordion-header" 
                    onClick={() => toggleSection('matrix')}
                    aria-expanded={expandedSections.matrix}
                  >
                    <span className="accordion-icon">{expandedSections.matrix ? '−' : '+'}</span>
                    <span className="accordion-title">發展熱點分析矩陣</span>
                  </button>
                  <div className="accordion-content">
                    {overviewMatrixSection}
                  </div>
                </div>

                <div className={`accordion-item ${expandedSections.trend ? 'accordion-item--expanded' : ''}`}>
                  <button 
                    className="accordion-header" 
                    onClick={() => toggleSection('trend')}
                    aria-expanded={expandedSections.trend}
                  >
                    <span className="accordion-icon">{expandedSections.trend ? '−' : '+'}</span>
                    <span className="accordion-title">全台各學制歷年學生數</span>
                  </button>
                  <div className="accordion-content">
                    {overviewTrendSection}
                  </div>
                </div>

                <div className={`accordion-item ${expandedSections.treemap ? 'accordion-item--expanded' : ''}`}>
                  <button 
                    className="accordion-header" 
                    onClick={() => toggleSection('treemap')}
                    aria-expanded={expandedSections.treemap}
                  >
                    <span className="accordion-icon">{expandedSections.treemap ? '−' : '+'}</span>
                    <span className="accordion-title">各地區學生分佈比例</span>
                  </button>
                  <div className="accordion-content">
                    {overviewTreemapSection}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === 'regional' ? (
            <RegionalTabPanel
              derived={derived}
              region={region}
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
              selectedTownshipId={selectedTownshipId}
              hoveredTownshipId={hoveredTownshipId}
              setHoveredTownshipId={setHoveredTownshipId}
              onSelectTownship={scenarioActions.handleTownshipSelect}
            />
          ) : null}

          {activeTab === 'schools' || activeTab === 'school-focus' ? (
            <div className="dashboard-side-shell__content dashboard-side-shell__content--schools">
              <SchoolDetailPanel
                    selectedCountyName={derived.selectedCounty?.name ?? null}
                    countyDetailError={countyDetailError}
                    isCountyDetailLoading={derived.isCountyDetailLoading}
                    schoolInsights={derived.schoolInsights}
                    selectedSchool={derived.selectedSchool}
                    schoolPanelTitle={activeTab === 'school-focus' && derived.selectedSchool ? derived.selectedSchool.name : derived.schoolPanelTitle}
                    panelMode={activeTab === 'school-focus' ? 'focus' : 'workspace'}
                    selectedTownshipSummary={derived.selectedTownshipSummary}
                    selectedCountySummary={derived.selectedCountySummary}
                    onSetWorkbenchView={onSetSchoolWorkbenchView}
                    onHoverSchool={onHoverSchool}
                    onSelectSchool={handleSchoolSelect}
                  />
            </div>
          ) : null}
        </div>

        <div className="side-shell__footer">
          {footer}
        </div>
      </section>

      <section className="dashboard-card dashboard-card--map">
        <div className="dashboard-card__body dashboard-card__map-body">
          {mapElement}

          <div className="map-floating-filters">
            <MapFloatingHelp 
              activeTab={activeTab} 
              activeCountyName={derived.selectedCounty?.name ?? null} 
            />

            <div className="map-floating-filters__main-stack">
              <div className="map-floating-filters__group--region-expanded">
                <AtlasRegionPill
                  region={region}
                  onSetRegion={(r) => scenarioActions.handleRegionSelect(r, { skipTabSwitch: true })}
                  startTransition={startTransition}
                  onReset={() => {
                    startTransition(() => {
                      scenarioActions.handleResetScope()
                      onSetEducationLevel('全部')
                      onSetManagementType('全部')
                      if (summaryYears.length > 0) {
                        onSetActiveYear(summaryYears[summaryYears.length - 1])
                      }
                    })
                  }}
                />
              </div>

              <div className="map-floating-filters__group map-floating-filters__group--playback">
                <AtlasPlaybackPill
                  isYearPlaybackActive={isYearPlaybackActive}
                  onTogglePlayback={onTogglePlayback}
                  activeYear={activeYear}
                  summaryYears={summaryYears}
                  onSetActiveYear={onSetActiveYear}
                  onStopPlayback={onStopPlayback}
                  startTransition={startTransition}
                />
              </div>
            </div>

            <div className="map-floating-filters__side-stack">
              <div className="map-floating-filters__group">
                <AtlasLevelPill
                  educationLevel={educationLevel}
                  onSetEducationLevel={onSetEducationLevel}
                  startTransition={startTransition}
                />
              </div>
              <div className="map-floating-filters__group">
                <AtlasTypePill
                  managementType={managementType}
                  onSetManagementType={onSetManagementType}
                  startTransition={startTransition}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default DashboardCanvas
