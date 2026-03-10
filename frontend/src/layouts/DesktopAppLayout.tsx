import type { ReactNode, RefObject } from 'react'

import AnomalyPanel from '../components/AnomalyPanel'
import AtlasFooter from '../components/AtlasFooter'
import DashboardCanvas from '../components/DashboardCanvas'
import DashboardHeader from '../components/DashboardHeader'
import DataGovernanceFlyout from '../components/DataGovernanceFlyout'
import type { useAtlasDerivedState } from '../hooks/useAtlasDerivedState'
import type { useAtlasScenarioActions } from '../hooks/useAtlasScenarioActions'
import type { AcademicYear, CountySchoolAtlasDataset, EducationLevelFilter, ManagementTypeFilter, RegionGroupFilter } from '../data/educationData'
import type { AtlasTab } from '../hooks/useAtlasQueryState'
import type { SavedComparisonScenario, InvestigationFilter } from '../hooks/types'
import type { AtlasTheme } from '../lib/constants'
import type { EducationSummaryDataset } from '../data/educationTypes'

type DesktopAppLayoutProps = {
  theme: AtlasTheme
  setTheme: (fn: (prev: AtlasTheme) => AtlasTheme) => void
  showGovernancePanel: boolean
  setShowGovernancePanel: (fn: (prev: boolean) => boolean) => void
  activeYear: AcademicYear
  summaryDataset: EducationSummaryDataset
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  region: RegionGroupFilter
  searchText: string
  isPending: boolean
  setActiveYear: (year: AcademicYear) => void
  setEducationLevel: (val: EducationLevelFilter) => void
  setManagementType: (val: ManagementTypeFilter) => void
  setRegion: (val: RegionGroupFilter) => void
  setSearchText: (val: string) => void
  setIsYearPlaybackActive: (val: boolean) => void
  startTransition: React.TransitionStartFunction

  // Canvas
  activeTab: AtlasTab
  sidebarRef: RefObject<HTMLElement | null>
  desktopTabItems: Array<{ id: AtlasTab; label: string }>
  setActiveTab: (tab: AtlasTab) => void
  mapElement: ReactNode
  derived: ReturnType<typeof useAtlasDerivedState>
  isYearPlaybackActive: boolean
  comparisonScenarioName: string
  setComparisonScenarioName: (name: string) => void
  favoriteScenarios: SavedComparisonScenario[]
  recentScenarios: SavedComparisonScenario[]
  activeScenarioSnapshot: SavedComparisonScenario | null
  copyFeedbackMessage: string | null
  scenarioFeedbackMessage: string | null
  countyDetailError: string | null
  countySchoolAtlasError: string | null
  selectedCountyId: string | null
  selectedTownshipId: string | null
  countySchoolAtlasCache: Record<string, CountySchoolAtlasDataset>
  schoolWorkbenchView: 'list' | 'analysis' | 'notes'
  onSetSchoolWorkbenchView: (view: 'list' | 'analysis' | 'notes') => void
  hoveredCountyId: string | null
  hoveredTownshipId: string | null
  hoveredSchoolId: string | null
  setHoveredCountyId: (id: string | null) => void
  setHoveredTownshipId: (id: string | null) => void
  regionalChartView: 'comparison' | 'ranking'
  countyChartView: 'comparison' | 'ranking'
  setRegionalChartView: (view: 'comparison' | 'ranking') => void
  setCountyChartView: (view: 'comparison' | 'ranking') => void
  scenarioActions: ReturnType<typeof useAtlasScenarioActions>
  handlePrefetchCounty: (countyId: string | null) => void
  handleSchoolSelect: (schoolId: string | null) => void
  setHoveredSchoolId: (id: string | null) => void

  // Footer / Governance
  isRefreshingData: boolean
  refreshStatus: string | null
  refreshData: () => Promise<void>
  selectedInvestigationId: string | null
  investigationFilter: InvestigationFilter
  setSelectedInvestigationId: (id: string | null) => void
  setInvestigationFilter: (filter: InvestigationFilter) => void
}

function DesktopAppLayout(props: DesktopAppLayoutProps) {
  return (
    <>
      <DashboardHeader
        theme={props.theme}
        onToggleTheme={() => props.setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        activeYear={props.activeYear}
        summaryYears={[...props.summaryDataset.years]}
        educationLevel={props.educationLevel}
        managementType={props.managementType}
        searchText={props.searchText}
        isPending={props.isPending}
        onSetActiveYear={props.setActiveYear}
        onSetEducationLevel={props.setEducationLevel}
        onSetManagementType={props.setManagementType}
        onSetSearchText={props.setSearchText}
        onStopPlayback={() => props.setIsYearPlaybackActive(false)}
        startTransition={props.startTransition}
      />

      <DashboardCanvas
        activeTab={props.activeTab}
        sidebarRef={props.sidebarRef}
        desktopTabItems={props.desktopTabItems}
        setActiveTab={props.setActiveTab}
        mapElement={props.mapElement}
        derived={props.derived}
        activeYear={props.activeYear}
        isYearPlaybackActive={props.isYearPlaybackActive}
        managementType={props.managementType}
        region={props.region}
        comparisonScenarioName={props.comparisonScenarioName}
        setComparisonScenarioName={props.setComparisonScenarioName}
        favoriteScenarios={props.favoriteScenarios}
        recentScenarios={props.recentScenarios}
        activeScenarioSnapshot={props.activeScenarioSnapshot}
        copyFeedbackMessage={props.copyFeedbackMessage}
        scenarioFeedbackMessage={props.scenarioFeedbackMessage}
        countyDetailError={props.countyDetailError}
        countySchoolAtlasError={props.countySchoolAtlasError}
        selectedCountyId={props.selectedCountyId}
        selectedTownshipId={props.selectedTownshipId}
        countySchoolAtlasCache={props.countySchoolAtlasCache}
        schoolWorkbenchView={props.schoolWorkbenchView}
        onSetSchoolWorkbenchView={props.onSetSchoolWorkbenchView}
        hoveredCountyId={props.hoveredCountyId}
        hoveredTownshipId={props.hoveredTownshipId}
        hoveredSchoolId={props.hoveredSchoolId}
        setHoveredCountyId={props.setHoveredCountyId}
        setHoveredTownshipId={props.setHoveredTownshipId}
        regionalChartView={props.regionalChartView}
        countyChartView={props.countyChartView}
        setRegionalChartView={props.setRegionalChartView}
        setCountyChartView={props.setCountyChartView}
        scenarioActions={props.scenarioActions}
        handlePrefetchCounty={props.handlePrefetchCounty}
        handleSchoolSelect={props.handleSchoolSelect}
        onHoverSchool={props.setHoveredSchoolId}
        onSetActiveYear={props.setActiveYear}
        onSetIsYearPlaybackActive={props.setIsYearPlaybackActive}
        summaryYears={[...props.summaryDataset.years]}
      />

      <AtlasFooter
        generatedAtLabel={props.derived.generatedAtLabel}
        isRefreshingData={props.isRefreshingData}
        refreshStatus={props.refreshStatus}
        onRefreshData={props.refreshData}
        onToggleGovernance={() => props.setShowGovernancePanel((c) => !c)}
        isGovernanceOpen={props.showGovernancePanel}
      />

      <DataGovernanceFlyout
        open={props.showGovernancePanel}
        onClose={() => props.setShowGovernancePanel(() => false)}
        generatedAtLabel={props.derived.generatedAtLabel}
        refreshStatus={props.refreshStatus}
        isRefreshingData={props.isRefreshingData}
        sources={props.summaryDataset?.sources ?? {
          points: 'https://stats.moe.gov.tw/edugissys/',
          statistics: 'https://depart.moe.edu.tw/ed4500/News.aspx?n=5A930C32CC6C3818&sms=91B3AAE8C6388B96',
          townshipBoundaries: 'https://www.nlsc.gov.tw/',
          countyBoundaries: 'https://www.nlsc.gov.tw/',
        }}
        assetMetrics={props.summaryDataset?.assetMetrics}
        anomalyCount={props.derived.filteredAnomalies.length}
        scopeNoteCount={props.derived.scopeNotes.length}
        missingCoordinates={props.summaryDataset?.missingCoordinates}
      >
        <AnomalyPanel
          filteredAnomalies={props.derived.filteredAnomalies}
          activeInvestigation={props.derived.activeInvestigation}
          selectedInvestigationId={props.selectedInvestigationId}
          investigationFilter={props.investigationFilter}
          scopeNotes={props.derived.scopeNotes}
          scopeHeadline={props.derived.scopeHeadline}
          onSelectInvestigation={props.setSelectedInvestigationId}
          onSetFilter={props.setInvestigationFilter}
          onDownloadInvestigation={props.scenarioActions.handleDownloadInvestigation}
          onDownloadAll={props.scenarioActions.handleDownloadAllInvestigations}
        />
      </DataGovernanceFlyout>
    </>
  )
}

export default DesktopAppLayout
