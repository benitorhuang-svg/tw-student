import { useDeferredValue, useState, useTransition } from 'react'

import './App.css'

import AtlasAnalysisPanel from './components/AtlasAnalysisPanel'
import AtlasControlRail from './components/AtlasControlRail'
import AtlasFooter from './components/AtlasFooter'
import type { AtlasTabItem } from './components/AtlasTabs'
import TaiwanExplorerMap from './components/TaiwanExplorerMap'
import { type AcademicYear, type EducationLevelFilter, type ManagementTypeFilter, type RegionGroupFilter } from './data/educationData'
import { createSavedComparisonScenario, readStoredScenarios } from './hooks/atlasHelpers'
import type { InvestigationFilter, SavedComparisonScenario } from './hooks/types'
import { useAtlasDerivedState } from './hooks/useAtlasDerivedState'
import { useAtlasLoadObservation } from './hooks/useAtlasLoadObservation'
import { useAtlasScenarioActions } from './hooks/useAtlasScenarioActions'
import { useAtlasTopPrefetch } from './hooks/useAtlasTopPrefetch'
import { readInitialQueryState, useAtlasTabState } from './hooks/useAtlasQueryState'
import { useAtlasUrlSync } from './hooks/useAtlasUrlSync'
import { useEducationData } from './hooks/useEducationData'
import { useFeedbackMessage } from './hooks/useFeedbackMessage'
import { useIsMobile } from './hooks/useIsMobile'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { useYearPlayback } from './hooks/useYearPlayback'
import MobileAppLayout from './layouts/MobileAppLayout'

const COMPARISON_FAVORITES_STORAGE_KEY = 'tw-atlas-comparison-favorites'
const COMPARISON_RECENTS_STORAGE_KEY = 'tw-atlas-comparison-recents'

function App() {
  const initialQueryState = readInitialQueryState()

  // ── Extracted hooks ──
  const isMobile = useIsMobile()
  const isOffline = useOnlineStatus()
  const loadObservation = useAtlasLoadObservation()
  const [isPending, startTransition] = useTransition()
  const copyFeedback = useFeedbackMessage()
  const scenarioFeedback = useFeedbackMessage()

  // ── Filter state ──
  const [activeYear, setActiveYear] = useState<AcademicYear>(initialQueryState.activeYear)
  const [educationLevel, setEducationLevel] = useState<EducationLevelFilter>(initialQueryState.educationLevel)
  const [managementType, setManagementType] = useState<ManagementTypeFilter>(initialQueryState.managementType)
  const [region, setRegion] = useState<RegionGroupFilter>(initialQueryState.region)
  const [searchText, setSearchText] = useState(initialQueryState.searchText)
  const deferredSearchText = useDeferredValue(searchText)

  // ── Selection state ──
  const [selectedCountyId, setSelectedCountyId] = useState<string | null>(initialQueryState.selectedCountyId)
  const [selectedTownshipId, setSelectedTownshipId] = useState<string | null>(initialQueryState.selectedTownshipId)
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null)

  // ── Comparison state ──
  const [comparisonCountyIds, setComparisonCountyIds] = useState<string[]>(initialQueryState.comparisonCountyIds)
  const [comparisonScenarioName, setComparisonScenarioName] = useState(initialQueryState.comparisonScenarioName)
  const [favoriteScenarios, setFavoriteScenarios] = useState<SavedComparisonScenario[]>(() => readStoredScenarios(COMPARISON_FAVORITES_STORAGE_KEY))
  const [recentScenarios, setRecentScenarios] = useState<SavedComparisonScenario[]>(() => readStoredScenarios(COMPARISON_RECENTS_STORAGE_KEY))

  // ── Investigation state ──
  const [selectedInvestigationId, setSelectedInvestigationId] = useState<string | null>(null)
  const [investigationFilter, setInvestigationFilter] = useState<InvestigationFilter>('全部')

  // ── Tab state with scroll memory ──
  const { activeTab, setActiveTab, sidebarRef } = useAtlasTabState(initialQueryState.tab)
  const [mapResetToken, setMapResetToken] = useState(0)

  // ── Data hooks ──
  const {
    summaryDataset,
    countyBoundaries,
    countyDetailCache,
    countyBucketCache,
    townshipBoundaryCache,
    loadError,
    countyDetailError,
    clearCountyDetailError,
    prefetchCounty,
    prefetchAllCounties,
    refreshData,
    isRefreshingData,
    refreshStatus,
  } = useEducationData(selectedCountyId)

  const [isYearPlaybackActive, setIsYearPlaybackActive] = useYearPlayback(summaryDataset, setActiveYear, startTransition)

  useAtlasUrlSync({
    summaryDataset,
    activeTab,
    activeYear,
    educationLevel,
    managementType,
    region,
    deferredSearchText,
    comparisonCountyIds,
    comparisonScenarioName,
    selectedCountyId,
    selectedTownshipId,
  })

  useAtlasTopPrefetch({
    summaryDataset,
    selectedCountyId,
    activeYear,
    educationLevel,
    managementType,
    region,
    deferredSearchText,
  })

  const derived = useAtlasDerivedState({
    summaryDataset,
    activeYear,
    educationLevel,
    managementType,
    region,
    deferredSearchText,
    selectedCountyId,
    selectedTownshipId,
    selectedSchoolId,
    comparisonCountyIds,
    comparisonScenarioName,
    countyDetailCache,
    countyBucketCache,
    townshipBoundaryCache,
    countyDetailError,
    loadObservation,
    investigationFilter,
    selectedInvestigationId,
  })

  const activeScenarioSnapshot = derived.activeScenarioSnapshot
    ? createSavedComparisonScenario(derived.activeScenarioSnapshot)
    : null
  const scenarioActions = useAtlasScenarioActions({
    summaryDataset,
    activeYear,
    educationLevel,
    managementType,
    region,
    comparisonCountyIds,
    comparisonScenarioName,
    favoriteScenarios,
    activeScenarioSnapshot: derived.activeScenarioSnapshot,
    filteredAnomalies: derived.filteredAnomalies,
    scopeHeadline: derived.scopeHeadline,
    favoritesStorageKey: COMPARISON_FAVORITES_STORAGE_KEY,
    recentsStorageKey: COMPARISON_RECENTS_STORAGE_KEY,
    setFavoriteScenarios,
    setRecentScenarios,
    setComparisonCountyIds,
    setComparisonScenarioName,
    setActiveYear,
    setEducationLevel,
    setManagementType,
    setRegion,
    setSelectedCountyId,
    setSelectedTownshipId,
    setSelectedSchoolId,
    setMapResetToken,
    setActiveTab,
    clearCountyDetailError,
    startTransition,
    copyFeedback,
    scenarioFeedback,
  })

  // ── Loading / error guards ──
  if (loadError) {
    return (
      <div className="app-shell">
        <section className="hero-panel hero-panel--single">
          <div className="hero-panel__content">
            <p className="eyebrow">資料載入失敗</p>
            <h1>正式資料尚未成功載入</h1>
            <p className="hero-panel__description">{loadError}</p>
          </div>
        </section>
      </div>
    )
  }

  if (!summaryDataset || !countyBoundaries) {
    return (
      <div className="app-shell">
        <section className="hero-panel hero-panel--single">
          <div className="hero-panel__content">
            <p className="eyebrow">正式資料準備中</p>
            <h1>正在載入教育部與官方行政區資料</h1>
            <p className="hero-panel__description">系統正在先載入全台摘要與官方縣市界線，縣市細節會在需要時按需補載。</p>
          </div>
        </section>
      </div>
    )
  }

  const handlePrefetchCounty = (countyId: string | null) => {
    if (!derived.selectedCounty && countyId) {
      prefetchCounty(countyId)
    }
  }

  const tabItems: AtlasTabItem[] = [
    { key: 'overview', label: '概況總覽' },
    { key: 'regional', label: '區域分析', badge: comparisonCountyIds.length > 0 ? `${derived.effectiveComparisonCountyIds.length}` : undefined },
    { key: 'schools', label: '學校工作台', badge: derived.schoolInsights.length > 0 ? `${derived.schoolInsights.length}` : undefined },
  ]

  const mapElement = (
    <TaiwanExplorerMap
      counties={derived.countySummaries}
      activeCountyId={derived.activeCountyId}
      activeTownshipId={derived.activeTownshipId}
      countyBoundaries={countyBoundaries}
      townshipBoundaries={derived.activeTownshipBoundaries}
      townshipRows={derived.townshipRows}
      schoolPoints={derived.schoolMapPoints}
      countyBuckets={derived.activeCountyBuckets}
      selectedSchoolId={derived.selectedSchool?.id ?? null}
      isTownshipBoundaryLoading={derived.isTownshipBoundaryLoading}
      activeTab={activeTab}
      mapResetToken={mapResetToken}
      onSelectCounty={scenarioActions.handleCountySelect}
      onSelectTownship={scenarioActions.handleTownshipSelect}
      onSelectSchool={setSelectedSchoolId}
      onResetScope={scenarioActions.handleResetScope}
      onHoverCounty={handlePrefetchCounty}
    />
  )

  return (
    <div className="app-shell" data-testid="atlas-app">
      {isMobile ? (
        <MobileAppLayout
          map={mapElement}
          tabItems={tabItems}
          activeTab={activeTab}
          onSetActiveTab={setActiveTab}
          scopePath={derived.scopePath}
          scopeHeadline={derived.scopeHeadline}
          scopeDescription={derived.scopeDescription}
          activeYear={activeYear}
          currentScope={derived.currentScope}
          summaryYears={[...summaryDataset.years]}
          educationLevel={educationLevel}
          managementType={managementType}
          region={region}
          searchText={searchText}
          isYearPlaybackActive={isYearPlaybackActive}
          isPending={isPending}
          countyQuickPicks={derived.countyQuickPicks}
          activeCountyId={derived.activeCountyId}
          activeTownshipId={derived.activeTownshipId}
          onSetActiveYear={setActiveYear}
          onSetEducationLevel={setEducationLevel}
          onSetManagementType={setManagementType}
          onSetRegion={setRegion}
          onSetSearchText={setSearchText}
          onSetIsYearPlaybackActive={setIsYearPlaybackActive}
          onResetScope={scenarioActions.handleResetScope}
          onSelectCounty={scenarioActions.handleCountySelect}
          onPrefetchCounty={handlePrefetchCounty}
          startTransition={startTransition}
          educationDistribution={derived.educationDistribution}
          observedCounties={derived.observedCounties}
          topCountyPrefetchIds={derived.topCountyPrefetchIds}
          loadObservation={loadObservation}
          offlineReadyWithBuckets={derived.offlineReadyWithBuckets}
          selectedCountyName={derived.selectedCounty?.name ?? null}
          topRows={derived.topRows}
          onSelectTownship={scenarioActions.handleTownshipSelect}
          onPrefetchAll={prefetchAllCounties}
          comparisonScenarioName={comparisonScenarioName}
          effectiveComparisonCountyIds={derived.effectiveComparisonCountyIds}
          comparisonCandidates={derived.comparisonCandidates}
          comparisonSummaries={derived.comparisonSummaries}
          favoriteScenarios={favoriteScenarios}
          recentScenarios={recentScenarios}
          activeScenarioSnapshot={activeScenarioSnapshot}
          favoriteScenarioIds={scenarioActions.favoriteScenarioIds}
          copyFeedbackMessage={copyFeedback.message}
          scenarioFeedbackMessage={scenarioFeedback.message}
          filteredAnomalies={derived.filteredAnomalies}
          activeInvestigation={derived.activeInvestigation}
          selectedInvestigationId={selectedInvestigationId}
          investigationFilter={investigationFilter}
          scopeNotes={derived.scopeNotes}
          onChangeScenarioName={setComparisonScenarioName}
          onToggleCounty={scenarioActions.toggleComparisonCounty}
          onCopyLink={scenarioActions.handleCopyComparisonLink}
          onSaveScenario={scenarioActions.handleSaveFavoriteScenario}
          onExportScenarios={scenarioActions.handleExportFavoriteScenarios}
          onImportScenarios={scenarioActions.handleImportFavoriteScenarios}
          onApplyScenario={scenarioActions.applySavedScenario}
          onTogglePinScenario={scenarioActions.handleTogglePinScenario}
          onRenameScenario={scenarioActions.handleRenameFavoriteScenario}
          onRemoveScenario={scenarioActions.handleRemoveFavoriteScenario}
          onSelectInvestigation={setSelectedInvestigationId}
          onSetFilter={setInvestigationFilter}
          onDownloadInvestigation={scenarioActions.handleDownloadInvestigation}
          onDownloadAll={scenarioActions.handleDownloadAllInvestigations}
          countyDetailError={countyDetailError}
          isCountyDetailLoading={derived.isCountyDetailLoading}
          schoolInsights={derived.schoolInsights}
          selectedSchool={derived.selectedSchool}
          schoolPanelTitle={derived.schoolPanelTitle}
          selectedTownshipSummary={derived.selectedTownshipSummary}
          selectedCountySummary={derived.selectedCountySummary}
          onSelectSchool={setSelectedSchoolId}
        />
      ) : (
        <>
          <div className="atlas-workbench" data-mode={activeTab}>
            <AtlasControlRail
              activeTab={activeTab}
              tabItems={tabItems}
              onSetActiveTab={setActiveTab}
              scopePath={derived.scopePath}
              scopeHeadline={derived.scopeHeadline}
              scopeDescription={derived.scopeDescription}
              summaryYears={[...summaryDataset.years]}
              activeYear={activeYear}
              educationLevel={educationLevel}
              managementType={managementType}
              region={region}
              searchText={searchText}
              isYearPlaybackActive={isYearPlaybackActive}
              isPending={isPending}
              countyQuickPicks={derived.countyQuickPicks}
              activeCountyId={derived.activeCountyId}
              onSetActiveYear={setActiveYear}
              onSetEducationLevel={setEducationLevel}
              onSetManagementType={setManagementType}
              onSetRegion={setRegion}
              onSetSearchText={setSearchText}
              onSetIsYearPlaybackActive={setIsYearPlaybackActive}
              onResetScope={scenarioActions.handleResetScope}
              onSelectCounty={scenarioActions.handleCountySelect}
              onPrefetchCounty={handlePrefetchCounty}
              startTransition={startTransition}
            >
              {mapElement}
            </AtlasControlRail>

            <AtlasAnalysisPanel
              sidebarRef={sidebarRef}
              activeTab={activeTab}
              activeYear={activeYear}
              isYearPlaybackActive={isYearPlaybackActive}
              isOffline={isOffline}
              activeCountyId={derived.activeCountyId}
              activeTownshipId={derived.activeTownshipId}
              currentScope={derived.currentScope}
              scopePath={derived.scopePath}
              scopeHeadline={derived.scopeHeadline}
              scopeDescription={derived.scopeDescription}
              educationDistribution={derived.educationDistribution}
              observedCounties={derived.observedCounties}
              topCountyPrefetchIds={derived.topCountyPrefetchIds}
              loadObservation={loadObservation}
              offlineReadyWithBuckets={derived.offlineReadyWithBuckets}
              totalCounties={derived.countySummaries.length}
              selectedCountyName={derived.selectedCounty?.name ?? null}
              topRows={derived.topRows}
              comparisonScenarioName={comparisonScenarioName}
              effectiveComparisonCountyIds={derived.effectiveComparisonCountyIds}
              comparisonCandidates={derived.comparisonCandidates}
              comparisonSummaries={derived.comparisonSummaries}
              favoriteScenarios={favoriteScenarios}
              recentScenarios={recentScenarios}
              activeScenarioSnapshot={activeScenarioSnapshot}
              favoriteScenarioIds={scenarioActions.favoriteScenarioIds}
              copyFeedbackMessage={copyFeedback.message}
              scenarioFeedbackMessage={scenarioFeedback.message}
              filteredAnomalies={derived.filteredAnomalies}
              activeInvestigation={derived.activeInvestigation}
              selectedInvestigationId={selectedInvestigationId}
              investigationFilter={investigationFilter}
              scopeNotes={derived.scopeNotes}
              countyDetailError={countyDetailError}
              isCountyDetailLoading={derived.isCountyDetailLoading}
              schoolInsights={derived.schoolInsights}
              selectedSchool={derived.selectedSchool}
              schoolPanelTitle={derived.schoolPanelTitle}
              selectedTownshipSummary={derived.selectedTownshipSummary}
              selectedCountySummary={derived.selectedCountySummary}
              onPrefetchAll={prefetchAllCounties}
              onSelectCounty={scenarioActions.handleCountySelect}
              onSelectTownship={scenarioActions.handleTownshipSelect}
              onPrefetchCounty={handlePrefetchCounty}
              onChangeScenarioName={setComparisonScenarioName}
              onToggleCounty={scenarioActions.toggleComparisonCounty}
              onCopyLink={scenarioActions.handleCopyComparisonLink}
              onSaveScenario={scenarioActions.handleSaveFavoriteScenario}
              onExportScenarios={scenarioActions.handleExportFavoriteScenarios}
              onImportScenarios={scenarioActions.handleImportFavoriteScenarios}
              onApplyScenario={scenarioActions.applySavedScenario}
              onTogglePinScenario={scenarioActions.handleTogglePinScenario}
              onRenameScenario={scenarioActions.handleRenameFavoriteScenario}
              onRemoveScenario={scenarioActions.handleRemoveFavoriteScenario}
              onSelectInvestigation={setSelectedInvestigationId}
              onSetFilter={setInvestigationFilter}
              onDownloadInvestigation={scenarioActions.handleDownloadInvestigation}
              onDownloadAll={scenarioActions.handleDownloadAllInvestigations}
              onSelectSchool={setSelectedSchoolId}
            />
          </div>

          <AtlasFooter
            generatedAtLabel={derived.generatedAtLabel}
            isRefreshingData={isRefreshingData}
            refreshStatus={refreshStatus}
            onRefreshData={refreshData}
          />
        </>
      )}
    </div>
  )
}

export default App
