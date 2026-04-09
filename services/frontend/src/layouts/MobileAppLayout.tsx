import { useState, type ReactNode, type TransitionStartFunction } from 'react'

import type { AtlasTab } from '../hooks/useAtlasQueryState'
import type { AtlasTabItem } from '../components/molecules/AtlasTabs'
import type {
    AcademicYear,
    EducationLevelFilter,
    ManagementTypeFilter,
    RegionGroupFilter,
} from '../data/educationData'
import {
    type CountyComparisonSummary,
    type EducationDistributionRow,
    type RankingSummary,
    type SchoolInsight,
    type ScopeSummary
} from '../lib/analytics'
import type {
    AtlasLoadObservationSnapshot,
    InvestigationFilter,
    InvestigationItem,
    SavedComparisonScenario
} from '../hooks/types'
import MobileFilterDrawer from '../components/mobile/MobileFilterDrawer'

// Mobile uses the same single-page dashboard structure, with filters moved into a drawer.

type MobileAppLayoutProps = {
    map: ReactNode
    tabItems: AtlasTabItem[]
    activeTab: AtlasTab
    onSetActiveTab: (tab: AtlasTab) => void

    // Scope
    scopePath: string[]
    scopeHeadline: string
    scopeDescription: string
    activeYear: AcademicYear
    currentScope: ScopeSummary

    // Filter
    summaryYears: AcademicYear[]
    educationLevel: EducationLevelFilter
    managementType: ManagementTypeFilter
    region: RegionGroupFilter
    isYearPlaybackActive: boolean
    isPending: boolean
    countyQuickPicks: Array<{ id: string; name: string }>
    activeCountyId: string | null
    activeTownshipId: string | null
    onSetActiveYear: (year: AcademicYear) => void
    onSetEducationLevel: (value: EducationLevelFilter) => void
    onSetManagementType: (value: ManagementTypeFilter) => void
    onSetRegion: (value: RegionGroupFilter) => void
    onSetIsYearPlaybackActive: (value: boolean) => void
    onResetScope: () => void
    onSelectCounty: (countyId: string) => void
    onPrefetchCounty: (countyId: string | null) => void
    startTransition: TransitionStartFunction

    // Overview
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
    selectedCountyName: string | null
    topRows: RankingSummary[]
    onSelectTownship: (townshipId: string) => void
    onPrefetchAll: () => void

    // Regional
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
    scopeNotes: import('../data/educationData').DataNote[]
    onChangeScenarioName: (value: string) => void
    onToggleCounty: (countyId: string) => void
    onCopyLink: () => void
    onSaveScenario: () => void
    onExportScenarios: () => void
    onImportScenarios: React.ChangeEventHandler<HTMLInputElement>
    onApplyScenario: (scenario: SavedComparisonScenario) => void
    onTogglePinScenario: (scenarioId: string) => void
    onRenameScenario: (scenarioId: string) => void
    onRemoveScenario: (scenarioId: string) => void
    onSelectInvestigation: (investigationId: string) => void
    onSetFilter: (filter: InvestigationFilter) => void
    onDownloadInvestigation: (item: InvestigationItem) => void
    onDownloadAll: () => void

    // Schools
    countyDetailError: string | null
    isCountyDetailLoading: boolean
    schoolInsights: SchoolInsight[]
    selectedSchool: SchoolInsight | null
    schoolPanelTitle: string
    selectedTownshipSummary: { label: string } | null
    selectedCountySummary: { label: string } | null
    onSelectSchool: (schoolId: string | null) => void
}

function MobileAppLayout(props: MobileAppLayoutProps) {
    const {
        map,
        activeYear,
        educationLevel,
        managementType,
        region,
        activeCountyId,
        onSelectCounty,
        onPrefetchCounty,
    } = props

    const [isFilterOpen, setIsFilterOpen] = useState(false)

    return (
        <>
            <div className="mobile-layout" data-view="map-centric">
                <div className="mobile-layout__full-map">
                    {map}
                </div>
            </div>

            <MobileFilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                years={props.summaryYears}
                activeYear={activeYear}
                educationLevel={educationLevel}
                managementType={managementType}
                region={region}
                isYearPlaybackActive={props.isYearPlaybackActive}
                isPending={props.isPending}
                countyQuickPicks={props.countyQuickPicks}
                activeCountyId={activeCountyId}
                onSetActiveYear={props.onSetActiveYear}
                onSetEducationLevel={props.onSetEducationLevel}
                onSetManagementType={props.onSetManagementType}
                onSetRegion={props.onSetRegion}
                onSetIsYearPlaybackActive={props.onSetIsYearPlaybackActive}
                onResetScope={props.onResetScope}
                onSelectCounty={onSelectCounty}
                onPrefetchCounty={onPrefetchCounty}
                startTransition={props.startTransition}
            />
        </>
    )
}

export default MobileAppLayout
