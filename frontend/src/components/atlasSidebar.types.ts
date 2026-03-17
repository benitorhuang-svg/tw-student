import type { ChangeEvent, RefObject, TransitionStartFunction } from 'react'

import type { DataNote } from '../data/educationData'
import type { AtlasLoadObservationSnapshot, AcademicYear, EducationLevelFilter, ManagementTypeFilter, RegionGroupFilter } from '../hooks/types'
import type { InvestigationFilter, InvestigationItem, SavedComparisonScenario } from '../hooks/types'
import type { AtlasTab } from '../hooks/useAtlasQueryState'
import type { CountyComparisonSummary, CountySummary, EducationDistributionRow, RankingSummary, SchoolInsight, ScopeSummary } from '../lib/analytics'
import type { AtlasTabItem } from './molecules/AtlasTabs'

export type AtlasSidebarProps = {
  sidebarRef: RefObject<HTMLElement | null>
  activeTab: AtlasTab
  tabItems: AtlasTabItem[]
  onSetActiveTab: (tab: AtlasTab) => void
  summaryYears: AcademicYear[]
  activeYear: AcademicYear
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  region: RegionGroupFilter
  isYearPlaybackActive: boolean
  isPending: boolean
  isOffline: boolean
  countyQuickPicks: CountySummary[]
  activeCountyId: string | null
  activeTownshipId: string | null
  currentScope: ScopeSummary
  scopePath: string[]
  scopeHeadline: string
  scopeDescription: string
  educationDistribution: EducationDistributionRow[]
  observedCounties: Array<{
    id: string
    name: string
    detailBytes: number
    bucketBytes: number
    townshipBytes: number
    hasBucketSlice: boolean
    hasTownshipSlice: boolean
  }>
  topCountyPrefetchIds: string
  loadObservation: AtlasLoadObservationSnapshot
  offlineReadyWithBuckets: number
  totalCounties: number
  selectedCountyName: string | null
  topRows: RankingSummary[]
  comparisonScenarioName: string
  effectiveComparisonCountyIds: string[]
  comparisonCandidates: Array<{ id: string; displayName: string }>
  comparisonSummaries: CountyComparisonSummary[]
  favoriteScenarios: SavedComparisonScenario[]
  recentScenarios: SavedComparisonScenario[]
  activeScenarioSnapshot: SavedComparisonScenario | null
  favoriteScenarioIds: Set<string>
  copyFeedbackMessage: string | null
  scenarioFeedbackMessage: string | null
  filteredAnomalies: InvestigationItem[]
  activeInvestigation: InvestigationItem | null
  selectedInvestigationId: string | null
  investigationFilter: InvestigationFilter
  scopeNotes: DataNote[]
  countyDetailError: string | null
  isCountyDetailLoading: boolean
  schoolInsights: SchoolInsight[]
  selectedSchool: SchoolInsight | null
  schoolPanelTitle: string
  selectedTownshipSummary: { label: string } | null
  selectedCountySummary: { label: string } | null
  onSetActiveYear: (year: AcademicYear) => void
  onSetEducationLevel: (value: EducationLevelFilter) => void
  onSetManagementType: (value: ManagementTypeFilter) => void
  onSetRegion: (value: RegionGroupFilter) => void
  onSetIsYearPlaybackActive: (value: boolean) => void
  onResetScope: () => void
  onSelectCounty: (countyId: string, options?: { skipTabSwitch?: boolean }) => void
  onSelectTownship: (townshipId: string, options?: { skipTabSwitch?: boolean }) => void
  onPrefetchCounty: (countyId: string | null) => void
  onPrefetchAll: () => void
  onChangeScenarioName: (value: string) => void
  onToggleCounty: (countyId: string) => void
  onCopyLink: () => void
  onSaveScenario: () => void
  onExportScenarios: () => void
  onImportScenarios: (event: ChangeEvent<HTMLInputElement>) => void
  onApplyScenario: (scenario: SavedComparisonScenario) => void
  onTogglePinScenario: (scenarioId: string) => void
  onRenameScenario: (scenarioId: string) => void
  onRemoveScenario: (scenarioId: string) => void
  onSelectInvestigation: (investigationId: string) => void
  onSetFilter: (filter: InvestigationFilter) => void
  onDownloadInvestigation: (item: InvestigationItem) => void
  onDownloadAll: () => void
  onSelectSchool: (schoolId: string | null) => void
  startTransition: TransitionStartFunction
}