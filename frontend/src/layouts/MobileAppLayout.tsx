import { lazy, Suspense, useEffect, useRef, useState, type ReactNode, type TransitionStartFunction } from 'react'

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

import MobileBottomNav from '../components/mobile/MobileBottomNav'
import MobileFilterDrawer from '../components/mobile/MobileFilterDrawer'
import MobileSchoolCardList from '../components/mobile/MobileSchoolCardList'
import InsightPanel from '../components/InsightPanel'
import ScopePanel from '../components/ScopePanel'
import TrendChart from '../components/TrendChart'
import { formatDelta, formatPercent, formatStudents } from '../lib/analytics'

const ComparisonPanel = lazy(() => import('../components/ComparisonPanel'))
const AnomalyPanel = lazy(() => import('../components/AnomalyPanel'))

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
    searchText: string
    isYearPlaybackActive: boolean
    isPending: boolean
    countyQuickPicks: Array<{ id: string; name: string }>
    activeCountyId: string | null
    activeTownshipId: string | null
    onSetActiveYear: (year: AcademicYear) => void
    onSetEducationLevel: (value: EducationLevelFilter) => void
    onSetManagementType: (value: ManagementTypeFilter) => void
    onSetRegion: (value: RegionGroupFilter) => void
    onSetSearchText: (value: string) => void
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
        tabItems,
        activeTab,
        onSetActiveTab,
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

        // Schools
        countyDetailError,
        isCountyDetailLoading,
        schoolInsights,
        selectedSchool,
        schoolPanelTitle,
        onSelectSchool,
    } = props

    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const panelRef = useRef<HTMLDivElement>(null)
    const scrollPositions = useRef<Record<AtlasTab, number>>({ overview: 0, regional: 0, schools: 0 })
    const [animKey, setAnimKey] = useState(0)

    const handleTabChange = (newTab: AtlasTab) => {
        if (panelRef.current) {
            scrollPositions.current[activeTab] = panelRef.current.scrollTop
        }
        setAnimKey((k) => k + 1)
        onSetActiveTab(newTab)
    }

    useEffect(() => {
        requestAnimationFrame(() => {
            if (panelRef.current) {
                panelRef.current.scrollTop = scrollPositions.current[activeTab]
            }
        })
    }, [activeTab])

    // Build active filter badges
    const filterBadges: string[] = []
    if (educationLevel !== '全部') filterBadges.push(educationLevel)
    if (managementType !== '全部') filterBadges.push(managementType)
    if (region !== '全部') filterBadges.push(region)

    return (
        <>
            <div className="mobile-layout" data-mode={activeTab}>
                {/* Map stage */}
                <div className="mobile-layout__map">
                    <div className="atlas-map-panel" style={{ height: '100%', borderRadius: 0 }}>
                        <div className="atlas-map-shell">
                            <div className="atlas-map-canvas-wrap">{map}</div>
                        </div>
                    </div>
                </div>

                {/* Analysis panel */}
                <div className="mobile-layout__panel" ref={panelRef}>
                    {/* Scope bar */}
                    <div className="mobile-scope-bar">
                        <div className="mobile-scope-bar__info">
                            <span className="mobile-scope-bar__headline">{scopeHeadline}</span>
                            <span className="mobile-scope-bar__sub">{currentScope.label}</span>
                        </div>
                        <span className="mobile-scope-bar__year">{formatAcademicYear(activeYear)}</span>
                    </div>

                    {/* Filter trigger */}
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

                    {/* Tab content */}
                    <div className="tab-content-enter" key={animKey} style={{ marginTop: 12 }}>
                        {activeTab === 'overview' ? (
                            <div className="analysis-overview" style={{ gridTemplateColumns: '1fr' }}>
                                <ScopePanel
                                    scopePath={props.scopePath}
                                    scopeHeadline={props.scopeHeadline}
                                    scopeDescription={props.scopeDescription}
                                    currentScope={currentScope}
                                    activeYear={activeYear}
                                    isYearPlaybackActive={props.isYearPlaybackActive}
                                    educationDistribution={props.educationDistribution}
                                    observedCounties={props.observedCounties}
                                    topCountyPrefetchIds={props.topCountyPrefetchIds}
                                    loadObservation={props.loadObservation}
                                    offlineReadyWithBuckets={props.offlineReadyWithBuckets}
                                    onPrefetchAll={props.onPrefetchAll}
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
                                    onHoverRow={() => { }}
                                    emptyMessage="目前條件沒有可顯示的排行資料。"
                                />
                            </div>
                        ) : null}

                        {activeTab === 'regional' ? (
                            <div className="analysis-regional" style={{ gridTemplateColumns: '1fr' }}>
                                <Suspense fallback={<div className="empty-state">載入區域分析…</div>}>
                                    <ComparisonPanel
                                        comparisonScenarioName={props.comparisonScenarioName}
                                        onChangeScenarioName={props.onChangeScenarioName}
                                        effectiveComparisonCountyIds={props.effectiveComparisonCountyIds}
                                        comparisonCandidates={props.comparisonCandidates}
                                        comparisonSummaries={props.comparisonSummaries}
                                        favoriteScenarios={props.favoriteScenarios}
                                        recentScenarios={props.recentScenarios}
                                        activeScenarioSnapshot={props.activeScenarioSnapshot}
                                        favoriteScenarioIds={props.favoriteScenarioIds}
                                        copyFeedback={props.copyFeedbackMessage}
                                        scenarioFeedback={props.scenarioFeedbackMessage}
                                        onToggleCounty={props.onToggleCounty}
                                        onCopyLink={props.onCopyLink}
                                        onSaveScenario={props.onSaveScenario}
                                        onExportScenarios={props.onExportScenarios}
                                        onImportScenarios={props.onImportScenarios}
                                        onApplyScenario={props.onApplyScenario}
                                        onTogglePinScenario={props.onTogglePinScenario}
                                        onRenameScenario={props.onRenameScenario}
                                        onRemoveScenario={props.onRemoveScenario}
                                    />

                                    <AnomalyPanel
                                        filteredAnomalies={props.filteredAnomalies}
                                        activeInvestigation={props.activeInvestigation}
                                        selectedInvestigationId={props.selectedInvestigationId}
                                        investigationFilter={props.investigationFilter}
                                        scopeNotes={props.scopeNotes}
                                        scopeHeadline={props.scopeHeadline}
                                        onSelectInvestigation={props.onSelectInvestigation}
                                        onSetFilter={props.onSetFilter}
                                        onDownloadInvestigation={props.onDownloadInvestigation}
                                        onDownloadAll={props.onDownloadAll}
                                    />
                                </Suspense>
                            </div>
                        ) : null}

                        {activeTab === 'schools' ? (
                            <div className="analysis-schools">
                                <div className="panel-heading">
                                    <div>
                                        <p className="eyebrow">學校資料</p>
                                        <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '0.98rem', color: 'var(--text-main)' }}>
                                            {schoolPanelTitle}
                                        </h3>
                                    </div>
                                </div>

                                {!selectedCountyName ? (
                                    <div className="empty-state">請先從地圖或排行選擇縣市。</div>
                                ) : countyDetailError ? (
                                    <div className="empty-state">{countyDetailError}</div>
                                ) : isCountyDetailLoading ? (
                                    <div className="empty-state">正在載入 {selectedCountyName} 學校資料...</div>
                                ) : (
                                    <>
                                        <MobileSchoolCardList
                                            schools={schoolInsights}
                                            selectedSchoolId={selectedSchool?.id ?? null}
                                            onSelectSchool={onSelectSchool}
                                        />

                                        {/* School detail drawer */}
                                        {selectedSchool ? (
                                            <>
                                                <div className="mobile-school-drawer-overlay" onClick={() => onSelectSchool(null)} />
                                                <div className="mobile-school-drawer">
                                                    <div className="school-focus">
                                                        <div className="school-focus__summary">
                                                            <div>
                                                                <p className="eyebrow">單校焦點</p>
                                                                <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '0.96rem', color: 'var(--text-main)' }}>
                                                                    {selectedSchool.name}
                                                                </h3>
                                                                <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: '0.82rem' }}>
                                                                    {selectedSchool.countyName} / {selectedSchool.townshipName} / {selectedSchool.educationLevel} / {selectedSchool.managementType}
                                                                </p>
                                                            </div>
                                                            <div className="school-focus__statline">
                                                                <strong style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', color: 'var(--text-main)' }}>
                                                                    {formatStudents(selectedSchool.currentStudents)} 人
                                                                </strong>
                                                                <span style={{ color: 'var(--text-soft)', fontSize: '0.8rem' }}>
                                                                    {formatDelta(selectedSchool.delta)} 人 / {formatPercent(selectedSchool.deltaRatio)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <TrendChart
                                                            chartId="mobile-school-trend"
                                                            title={`${selectedSchool.name} 歷年學生數`}
                                                            subtitle="單校趨勢"
                                                            points={selectedSchool.trend}
                                                            activeYear={activeYear}
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        ) : null}
                                    </>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Bottom navigation */}
            <MobileBottomNav activeTab={activeTab} items={tabItems} onSelectTab={handleTabChange} />

            {/* Filter drawer */}
            <MobileFilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                years={props.summaryYears}
                activeYear={activeYear}
                educationLevel={educationLevel}
                managementType={managementType}
                region={region}
                searchText={props.searchText}
                isYearPlaybackActive={props.isYearPlaybackActive}
                isPending={props.isPending}
                countyQuickPicks={props.countyQuickPicks}
                activeCountyId={activeCountyId}
                onSetActiveYear={props.onSetActiveYear}
                onSetEducationLevel={props.onSetEducationLevel}
                onSetManagementType={props.onSetManagementType}
                onSetRegion={props.onSetRegion}
                onSetSearchText={props.onSetSearchText}
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
