import React from 'react'
import type { ReactNode, RefObject, TransitionStartFunction } from 'react'

// Organisms (Atomic Design Level)
import OverviewTabPanel from './organisms/OverviewTabPanel'
import CountyTabPanel from './organisms/CountyTabPanel'
import SchoolDetailPanel from './organisms/SchoolDetailPanel'

// Molecules & Atoms
import AtlasTabs from './molecules/AtlasTabs'

// Types
import type { AtlasTab } from '../hooks/useAtlasQueryState'
import type { useAtlasDerivedState } from '../hooks/useAtlasDerivedState'
import type {
  RegionGroupFilter,
  AcademicYear,
  EducationLevelFilter,
  ManagementTypeFilter
} from '../data/educationData'
import type { TrendPoint } from '../lib/analytics.types'
import type { InvestigationItem, SavedComparisonScenario, InvestigationFilter } from '../hooks/types'

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
  // Missing Investigation Props
  selectedInvestigationId: string | null
  investigationFilter: InvestigationFilter
  setSelectedInvestigationId: (id: string | null) => void
  setInvestigationFilter: (filter: InvestigationFilter) => void
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
  // DashboardCanvas is now primarily a shell orchestrating organisms

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
            <OverviewTabPanel
              derived={derived}
              hoveredCountyId={hoveredCountyId}
              selectedCountyId={selectedCountyId}
              setHoveredCountyId={setHoveredCountyId}
              handlePrefetchCounty={handlePrefetchCounty}
              scenarioActions={scenarioActions}
              nationalEducationTrendSeries={nationalEducationTrendSeries}
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
                selectedSchool={derived.selectedSchoolInsight}
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
