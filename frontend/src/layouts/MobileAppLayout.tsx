import { useState, type ReactNode, type TransitionStartFunction } from 'react'

import type { AtlasTab } from '../hooks/useAtlasQueryState'
import type { AtlasTabItem } from '../components/AtlasTabs'
import type {
    AcademicYear,
    EducationLevelFilter,
    ManagementTypeFilter,
    RegionGroupFilter,
} from '../data/educationData'
import { formatAcademicYear, type CountyComparisonSummary, type EducationDistributionRow, type RankingSummary, type SchoolInsight, type ScopeSummary } from '../lib/analytics'
import type { AtlasLoadObservationSnapshot } from '../hooks/types'
import type { InvestigationFilter, InvestigationItem, SavedComparisonScenario } from '../hooks/types'

import MobileFilterDrawer from '../components/mobile/MobileFilterDrawer'
import InsightPanel from '../components/InsightPanel'
import ScopePanel from '../components/ScopePanel'

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
        scopeHeadline,
        activeYear,
        currentScope,
        educationLevel,
        managementType,
        region,
        selectedCountyName,
        topRows,
        activeCountyId,
        activeTownshipId,
        onSelectCounty,
        onSelectTownship,
        onPrefetchCounty,
    } = props

    const [isFilterOpen, setIsFilterOpen] = useState(false)

    const filterBadges: string[] = []
    if (educationLevel !== '全部') filterBadges.push(educationLevel)
    if (managementType !== '全部') filterBadges.push(managementType)

    return (
        <>
            <div className="mobile-layout" data-mode="overview">
                <div className="mobile-layout__map">
                    <div className="atlas-map-panel" style={{ height: '100%', borderRadius: 0 }}>
                        <div className="atlas-map-shell">
                            <div className="atlas-map-canvas-wrap">{map}</div>
                        </div>
                    </div>
                </div>

                <div className="mobile-layout__panel">
                    <div className="mobile-scope-bar">
                        <div className="mobile-scope-bar__info">
                            <span className="mobile-scope-bar__headline">{scopeHeadline}</span>
                            <span className="mobile-scope-bar__sub">{currentScope.label}</span>
                        </div>
                        <span className="mobile-scope-bar__year">{formatAcademicYear(activeYear)}</span>
                    </div>

                    <button type="button" className="mobile-filter-trigger" onClick={() => setIsFilterOpen(true)}>
                        <span>🔍 篩選條件</span>
                        <div className="mobile-filter-trigger__badges">
                            {filterBadges.length > 0
                                ? filterBadges.map((b) => (
                                    <span key={b} className="mobile-filter-trigger__badge">
                                        {b}
                                    </span>
                                ))
                                : <span className="mobile-filter-trigger__badge">全部</span>}
                        </div>
                    </button>

                    <div className="mobile-layout__stack tab-content-enter">
                            <ScopePanel
                                scopePath={props.scopePath}
                                scopeHeadline={props.scopeHeadline}
                                scopeDescription={props.scopeDescription}
                                currentScope={currentScope}
                                activeYear={activeYear}
                                isYearPlaybackActive={props.isYearPlaybackActive}
                                educationDistribution={props.educationDistribution}
                            />

                            <InsightPanel
                                title={selectedCountyName ? `${selectedCountyName} 鄉鎮排行` : '全台縣市排行'}
                                subtitle={selectedCountyName ? '點擊鄉鎮即可同步切換' : '點擊縣市即可同步縮小地圖範圍'}
                                rows={topRows}
                                activeRowId={activeTownshipId ?? activeCountyId}
                                onSelectRow={(rowId) => {
                                    if (selectedCountyName) {
                                        onSelectTownship(rowId)
                                        return
                                    }
                                    onSelectCounty(rowId)
                                }}
                                onHoverRow={(rowId) => {
                                    if (!selectedCountyName && rowId) {
                                        onPrefetchCounty(rowId)
                                        return
                                    }

                                    onPrefetchCounty(null)
                                }}
                                emptyMessage="目前條件沒有可顯示的排行資料。"
                            />
                    </div>
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
