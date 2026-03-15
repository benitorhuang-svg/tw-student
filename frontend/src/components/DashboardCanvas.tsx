import { useState, useMemo } from 'react'
import type { ReactNode, RefObject, TransitionStartFunction } from 'react'

// Layout/System Components
import AtlasTabs from './AtlasTabs'
import CountyTabPanel from './CountyTabPanel'
import RegionalTabPanel from './RegionalTabPanel'
import SchoolDetailPanel from './SchoolDetailPanel'

// Molecules & Atoms
import OverviewAccordion from './molecules/OverviewAccordion'
import { 
  OverviewMatrixSection, 
  OverviewTrendSection, 
  OverviewTreemapSection 
} from './molecules/OverviewSections'

// Types
import type { AtlasTab } from '../hooks/useAtlasQueryState'
import type { useAtlasDerivedState } from '../hooks/useAtlasDerivedState'
import type { 
  RegionGroupFilter, 
  CountySchoolAtlasDataset, 
  AcademicYear, 
  EducationLevelFilter, 
  ManagementTypeFilter 
} from '../data/educationData'
import type { TrendPoint } from '../lib/analytics.types'
import type { InvestigationItem, SavedComparisonScenario } from '../hooks/types'

// Styles
import '../styles/templates/dashboard-shell/01-premium-cards-system.css'

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
  region,
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
  hoveredSchoolId,
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

  // Memoized derived data for charts
  const matrixPoints = useMemo(() => derived.countyRankingRows.map((row) => ({
    id: row.id,
    label: row.label,
    x: row.students,
    y: (row.delta / Math.max(derived.globalNationalSummary?.students ?? 0, 1)) * 100,
    size: row.schools,
  })), [derived.countyRankingRows, derived.globalNationalSummary])

  const treemapGroups = useMemo(() => {
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
  }, [derived.countyRankingRows])

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

          {activeTab === 'overview' && (
            <div className="dashboard-side-shell__content dashboard-side-shell__content--overview">
              <OverviewAccordion
                expandedSections={expandedSections}
                onToggleSection={toggleSection}
                matrixSection={
                  <OverviewMatrixSection
                    points={matrixPoints}
                    activePointId={hoveredCountyId ?? selectedCountyId}
                    onHoverPoint={(id) => {
                      setHoveredCountyId(id)
                      handlePrefetchCounty(id)
                    }}
                    onSelectPoint={(id) => scenarioActions.handleCountySelect(id, { skipTabSwitch: true })}
                  />
                }
                trendSection={
                  <OverviewTrendSection series={nationalEducationTrendSeries} />
                }
                treemapSection={
                  <OverviewTreemapSection
                    groups={treemapGroups}
                    activeLeafId={hoveredCountyId ?? selectedCountyId}
                    onSelectLeaf={(id) => scenarioActions.handleCountySelect(id, { skipTabSwitch: true })}
                  />
                }
              />
            </div>
          )}

          {activeTab === 'regional' && (
            <RegionalTabPanel
              derived={derived}
              region={region}
              hoveredCountyId={hoveredCountyId}
              selectedCountyId={selectedCountyId}
              setHoveredCountyId={setHoveredCountyId}
              scenarioActions={scenarioActions}
              handlePrefetchCounty={handlePrefetchCounty}
            />
          )}

          {activeTab === 'county' && (
            <CountyTabPanel
              derived={derived}
              selectedTownshipId={selectedTownshipId}
              hoveredTownshipId={hoveredTownshipId}
              setHoveredTownshipId={setHoveredTownshipId}
              onSelectTownship={scenarioActions.handleTownshipSelect}
            />
          )}

          {(activeTab === 'schools' || activeTab === 'school-focus') && (
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
                hoveredSchoolId={hoveredSchoolId}
              />
            </div>
          )}
        </div>

        <div className="side-shell__footer">
          {footer}
        </div>
      </section>

      <section className="dashboard-card dashboard-card--map">
        <div className="dashboard-card__body dashboard-card__map-body">
          {mapElement}
        </div>
      </section>
    </main>
  )
}

export default DashboardCanvas
