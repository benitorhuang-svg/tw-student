import type { ReactNode, RefObject } from 'react'

import AnomalyPanel from '../components/organisms/AnomalyPanel'
import AtlasFooter from '../components/molecules/AtlasFooter'
import DashboardCanvas from '../components/DashboardCanvas'
import DashboardHeader from '../components/DashboardHeader'
import DataGovernanceFlyout from '../components/organisms/DataGovernanceFlyout'
import type { useAtlasDerivedState } from '../hooks/useAtlasDerivedState'
import type { useAtlasScenarioActions } from '../hooks/useAtlasScenarioActions'
import type { AcademicYear, CountyBoundaryCollection, CountyBucketDataset, CountyDetailDataset, CountySchoolAtlasDataset, EducationLevelFilter, ManagementTypeFilter, RegionGroupFilter, TownshipBoundaryCollection } from '../data/educationData'
import type { AtlasTab } from '../hooks/useAtlasQueryState'
import type { SavedComparisonScenario, InvestigationFilter } from '../hooks/types'
import type { AtlasTheme } from '../lib/constants'
import type { TrendPoint } from '../lib/analytics.types'
import type { DataManifest, DataRefreshSummary, EducationSummaryDataset, ValidationReport } from '../data/educationTypes'

type DesktopAppLayoutProps = {
  theme: AtlasTheme
  setTheme: (fn: (prev: AtlasTheme) => AtlasTheme) => void
  showGovernancePanel: boolean
  setShowGovernancePanel: (val: boolean | ((prev: boolean) => boolean)) => void
  activeYear: AcademicYear
  summaryDataset: EducationSummaryDataset
  countyBoundaries: CountyBoundaryCollection
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  region: RegionGroupFilter
  isPending: boolean
  setActiveYear: (year: AcademicYear) => void
  setEducationLevel: (val: EducationLevelFilter) => void
  setManagementType: (val: ManagementTypeFilter) => void
  onSetRegion: (val: RegionGroupFilter) => void
  setIsYearPlaybackActive: (val: boolean) => void
  startTransition: React.TransitionStartFunction

  // Canvas
  activeTab: AtlasTab
  sidebarRef: RefObject<HTMLDivElement | null>
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
  countyDetailCache: Record<string, CountyDetailDataset>
  countyBucketCache: Record<string, CountyBucketDataset>
  townshipBoundaryCache: Record<string, TownshipBoundaryCollection>
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
  localManifest: DataManifest | null
  remoteManifest: DataManifest | null
  validationReport: ValidationReport | null
  refreshSummary: DataRefreshSummary | null
  isRefreshingData: boolean
  refreshStatus: string | null
  refreshData: () => Promise<void>
  selectedInvestigationId: string | null
  investigationFilter: InvestigationFilter
  setSelectedInvestigationId: (id: string | null) => void
  setInvestigationFilter: (filter: InvestigationFilter) => void
  nationalEducationTrendSeries: Array<{ label: string, points: TrendPoint[] }>
}

function DesktopAppLayout(props: DesktopAppLayoutProps) {
  const handleTabSelect = (tab: AtlasTab) => {
    if (tab === 'welcome') {
      window.location.href = '/'
      return
    }
    props.setActiveTab(tab)
  }

  const governanceAlertCount =
    (props.validationReport?.overallStatus === 'fail' || props.validationReport?.overallStatus === 'warning' ? 1 : 0) +
    (props.localManifest && props.remoteManifest && props.localManifest.contentHash !== props.remoteManifest.contentHash ? 1 : 0) +
    (props.refreshSummary && ['failed', 'partial-failure', 'fallback'].includes(props.refreshSummary.overallStatus) ? 1 : 0)

  return (
    <>
      <DashboardCanvas
        activeTab={props.activeTab}
        sidebarRef={props.sidebarRef}
        desktopTabItems={props.desktopTabItems}
        setActiveTab={handleTabSelect}
        mapElement={props.mapElement}
        header={
          <DashboardHeader
            theme={props.theme}
            activeYear={props.activeYear}
            summaryYears={[...props.summaryDataset.years]}
            isYearPlaybackActive={props.isYearPlaybackActive}
            onToggleTheme={() => props.setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            onSetActiveYear={props.setActiveYear}
            onStopPlayback={() => props.setIsYearPlaybackActive(false)}
            onTogglePlayback={() => props.setIsYearPlaybackActive(!props.isYearPlaybackActive)}
            startTransition={props.startTransition}
          />
        }
        footer={
          <AtlasFooter
            onToggleGovernance={() => {
              props.setShowGovernancePanel((current) => !current)
            }}
            isGovernanceOpen={props.showGovernancePanel}
            anomalyCount={governanceAlertCount}
          />
        }
        derived={props.derived}
        activeYear={props.activeYear}
        summaryYears={[...props.summaryDataset.years]}
        educationLevel={props.educationLevel}
        managementType={props.managementType}
        region={props.region}
        onSetActiveYear={props.setActiveYear}
        onSetEducationLevel={props.setEducationLevel}
        onSetManagementType={props.setManagementType}
        onStopPlayback={() => props.setIsYearPlaybackActive(false)}
        onTogglePlayback={() => props.setIsYearPlaybackActive(!props.isYearPlaybackActive)}
        isYearPlaybackActive={props.isYearPlaybackActive}
        startTransition={props.startTransition}
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
        nationalEducationTrendSeries={props.nationalEducationTrendSeries}
        selectedInvestigationId={props.selectedInvestigationId}
        investigationFilter={props.investigationFilter}
        setSelectedInvestigationId={props.setSelectedInvestigationId}
        setInvestigationFilter={props.setInvestigationFilter}
      />

      <DataGovernanceFlyout
        open={props.showGovernancePanel}
        onClose={() => props.setShowGovernancePanel(false)}
        generatedAtLabel={props.derived.generatedAtLabel}
        isRefreshingData={props.isRefreshingData}
        localManifest={props.localManifest}
        remoteManifest={props.remoteManifest}
        validationReport={props.validationReport}
      >
        <AnomalyPanel
          filteredAnomalies={props.derived.filteredAnomalies}
          activeInvestigation={props.derived.activeInvestigation}
          selectedInvestigationId={props.selectedInvestigationId}
          investigationFilter={props.investigationFilter}
          anomaliesCounts={props.derived.anomaliesCounts ?? { '全部': 0, '缺年度': 0, '待確認': 0, '停辦/整併': 0, '正式註記': 0 }}
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
