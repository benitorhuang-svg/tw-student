import { Suspense, lazy, useEffect, useTransition } from 'react'

import './App.css'

import { useAtlasAppState } from './hooks/useAtlasAppState'
import { useAtlasLoadObservation } from './hooks/useAtlasLoadObservation'
import { useAtlasOrchestration } from './hooks/useAtlasOrchestration'
import { buildDesktopTabItems } from './hooks/atlasHelpers'
import { useEducationData } from './hooks/useEducationData'
import { useFeedbackMessage } from './hooks/useFeedbackMessage'
import { useIsMobile } from './hooks/useIsMobile'
import { useYearPlayback } from './hooks/useYearPlayback'
import { THEME_STORAGE_KEY } from './lib/constants'

const TaiwanExplorerMap = lazy(() => import('./components/TaiwanExplorerMap'))
const DesktopAppLayout = lazy(() => import('./layouts/DesktopAppLayout'))
const MobileAppLayout = lazy(() => import('./layouts/MobileAppLayout'))

function AppLoadingShell({ message }: { message: string }) {
  return (
    <div className="app-shell app-shell--loading">
      <section className="hero-panel hero-panel--single"><div className="hero-panel__content">
        <p className="eyebrow">介面載入中</p>
        <h1>{message}</h1>
        <p className="hero-panel__description">正在分批載入地圖元件與分析工作台，避免初始 bundle 過大。</p>
      </div></section>
    </div>
  )
}

function App() {
  const state = useAtlasAppState()
  const {
    theme, setTheme,
    showGovernancePanel, setShowGovernancePanel,
    regionalChartView, setRegionalChartView,
    countyChartView, setCountyChartView,
    schoolWorkbenchView, setSchoolWorkbenchView,
    hoveredCountyId, setHoveredCountyId,
    hoveredTownshipId, setHoveredTownshipId,
    hoveredSchoolId, setHoveredSchoolId,
    activeYear, setActiveYear,
    educationLevel, setEducationLevel,
    managementType, setManagementType,
    region, setRegion,
    searchText, setSearchText,
    deferredSearchText,
    selectedCountyId, setSelectedCountyId,
    selectedTownshipId, setSelectedTownshipId,
    selectedSchoolId, setSelectedSchoolId,
    comparisonCountyIds, setComparisonCountyIds,
    comparisonScenarioName, setComparisonScenarioName,
    favoriteScenarios, setFavoriteScenarios,
    recentScenarios, setRecentScenarios,
    selectedInvestigationId, setSelectedInvestigationId,
    investigationFilter, setInvestigationFilter,
    activeTab, setActiveTab, sidebarRef,
    mapResetToken, setMapResetToken,
    mapZoom, setMapZoom,
    mapLat, setMapLat,
    mapLon, setMapLon,
  } = state

  const isMobile = useIsMobile()
  const loadObservation = useAtlasLoadObservation()
  const [isPending, startTransition] = useTransition()
  const copyFeedback = useFeedbackMessage()
  const scenarioFeedback = useFeedbackMessage()

  // ── Data hooks ──
  const educationData = useEducationData(selectedCountyId)
  const {
    summaryDataset, countyBoundaries, loadError, countyDetailError,
    countySchoolAtlasCache, countySchoolAtlasError,
    localManifest, remoteManifest, validationReport, refreshSummary,
    prefetchCounty, refreshData, isRefreshingData, refreshStatus,
  } = educationData

  const [isYearPlaybackActive, setIsYearPlaybackActive] = useYearPlayback(summaryDataset, setActiveYear, startTransition)

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const { derived, scenarioActions, activeScenarioSnapshot } = useAtlasOrchestration({
    activeTab, activeYear, educationLevel, managementType, region,
    deferredSearchText, selectedCountyId, selectedTownshipId, selectedSchoolId,
    comparisonCountyIds, comparisonScenarioName, favoriteScenarios,
    investigationFilter, selectedInvestigationId,
    setFavoriteScenarios, setRecentScenarios, setComparisonCountyIds,
    setComparisonScenarioName, setActiveYear, setEducationLevel,
    setManagementType, setRegion, setSelectedCountyId, setSelectedTownshipId,
    setSelectedSchoolId, setMapResetToken, setActiveTab,
    startTransition, copyFeedback, scenarioFeedback,
    educationData, loadObservation,
    mapZoom, mapLat, mapLon,
  })

  // ── Loading / error guards ──
  if (loadError || !summaryDataset || !countyBoundaries) {
    return (
      <div className="app-shell">
        <section className="hero-panel hero-panel--single"><div className="hero-panel__content">
          <p className="eyebrow">{loadError ? '資料載入失敗' : '正式資料準備中'}</p>
          <h1>{loadError ? '正式資料尚未成功載入' : '正在載入教育部與官方行政區資料'}</h1>
          <p className="hero-panel__description">{loadError ?? '系統正在先載入全台摘要與官方縣市界線，縣市細節會在需要時按需補載。'}</p>
        </div></section>
      </div>
    )
  }

  const handlePrefetchCounty = (countyId: string | null) => { if (!derived.selectedCounty && countyId) prefetchCounty(countyId) }

  const handleSchoolSelect = (schoolId: string | null) => {
    const nextId = selectedSchoolId === schoolId ? null : schoolId
    startTransition(() => setSelectedSchoolId(nextId))
    setSchoolWorkbenchView(nextId ? 'analysis' : 'list')
    if (nextId) setActiveTab('school-focus', 0)
    else if (activeTab === 'school-focus') setActiveTab('schools', 0)
  }

  const handleSchoolWorkbenchView = (view: 'list' | 'analysis' | 'notes') => {
    setSchoolWorkbenchView(view)
    if (view === 'list') { setActiveTab('schools', 0); return }
    if (derived.selectedSchool) setActiveTab('school-focus', 0)
  }

  const desktopTabItems = buildDesktopTabItems(region, derived.selectedCounty, derived.selectedTownshipSummary, derived.selectedSchool)

  const mapElement = (
    <TaiwanExplorerMap
      counties={derived.countySummaries}
      activeRegion={region}
      activeCountyId={derived.activeCountyId}
      activeTownshipId={derived.activeTownshipId}
      countyBoundaries={countyBoundaries}
      townshipBoundaries={derived.activeTownshipBoundaries}
      townshipRows={derived.townshipRows}
      schoolPoints={derived.schoolMapPoints}
      countyBuckets={derived.activeCountyBuckets}
      selectedSchoolId={derived.selectedSchool?.id ?? null}
      highlightedCountyId={hoveredCountyId}
      highlightedTownshipId={hoveredTownshipId}
      highlightedSchoolId={hoveredSchoolId}
      isTownshipBoundaryLoading={derived.isTownshipBoundaryLoading}
      activeTab={activeTab}
      theme={theme}
      mapResetToken={mapResetToken}
      onSelectCounty={scenarioActions.handleCountySelect}
      onSelectTownship={scenarioActions.handleTownshipSelect}
      onSelectSchool={handleSchoolSelect}
      onHoverCounty={handlePrefetchCounty}
      onZoomChange={setMapZoom}
      onMoveEnd={(lat: number, lon: number) => { setMapLat(lat); setMapLon(lon) }}
      initialMapZoom={mapZoom}
      initialMapLat={mapLat}
      initialMapLon={mapLon}
      scopePath={derived.scopePath}
      onNavigateScope={scenarioActions.handleNavigateScope}
    />
  )

  return (
    <Suspense fallback={<AppLoadingShell message="正在載入台灣教育地圖與分析元件" />}>
      <div className="app-shell" data-testid="atlas-app" data-theme={theme}>
        {isMobile ? (
          <MobileAppLayout
          map={mapElement}
          tabItems={[]}
          activeTab="overview"
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
          selectedCountyName={derived.selectedCounty?.name ?? null}
          topRows={derived.topRows}
          onSelectTownship={scenarioActions.handleTownshipSelect}
          observedCounties={derived.observedCounties}
          topCountyPrefetchIds={derived.topCountyPrefetchIds}
          loadObservation={loadObservation}
          offlineReadyWithBuckets={derived.offlineReadyWithBuckets}
          onPrefetchAll={() => undefined}
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
          <DesktopAppLayout
          theme={theme}
          setTheme={setTheme}
          showGovernancePanel={showGovernancePanel}
          setShowGovernancePanel={setShowGovernancePanel}
          activeYear={activeYear}
          summaryDataset={summaryDataset}
          educationLevel={educationLevel}
          managementType={managementType}
          region={region}
          searchText={searchText}
          isPending={isPending}
          setActiveYear={setActiveYear}
          setEducationLevel={setEducationLevel}
          setManagementType={setManagementType}
          setRegion={scenarioActions.handleRegionSelect}
          setSearchText={setSearchText}
          setIsYearPlaybackActive={setIsYearPlaybackActive}
          startTransition={startTransition}
          activeTab={activeTab}
          sidebarRef={sidebarRef}
          desktopTabItems={desktopTabItems}
          setActiveTab={setActiveTab}
          mapElement={mapElement}
          derived={derived}
          isYearPlaybackActive={isYearPlaybackActive}
          comparisonScenarioName={comparisonScenarioName}
          setComparisonScenarioName={setComparisonScenarioName}
          favoriteScenarios={favoriteScenarios}
          recentScenarios={recentScenarios}
          activeScenarioSnapshot={activeScenarioSnapshot}
          copyFeedbackMessage={copyFeedback.message}
          scenarioFeedbackMessage={scenarioFeedback.message}
          countyDetailError={countyDetailError}
          countySchoolAtlasError={countySchoolAtlasError}
          selectedCountyId={selectedCountyId}
          selectedTownshipId={selectedTownshipId}
          schoolWorkbenchView={schoolWorkbenchView}
          onSetSchoolWorkbenchView={handleSchoolWorkbenchView}
          hoveredCountyId={hoveredCountyId}
          hoveredTownshipId={hoveredTownshipId}
          hoveredSchoolId={hoveredSchoolId}
          setHoveredCountyId={setHoveredCountyId}
          setHoveredTownshipId={setHoveredTownshipId}
          regionalChartView={regionalChartView}
          countyChartView={countyChartView}
          setRegionalChartView={setRegionalChartView}
          setCountyChartView={setCountyChartView}
          scenarioActions={scenarioActions}
          handlePrefetchCounty={handlePrefetchCounty}
          handleSchoolSelect={handleSchoolSelect}
          setHoveredSchoolId={setHoveredSchoolId}
          countySchoolAtlasCache={countySchoolAtlasCache}
          localManifest={localManifest}
          remoteManifest={remoteManifest}
          validationReport={validationReport}
          refreshSummary={refreshSummary}
          isRefreshingData={isRefreshingData}
          refreshStatus={refreshStatus}
          refreshData={refreshData}
          selectedInvestigationId={selectedInvestigationId}
          investigationFilter={investigationFilter}
          setSelectedInvestigationId={setSelectedInvestigationId}
          setInvestigationFilter={setInvestigationFilter}
          nationalEducationTrendSeries={derived.nationalEducationTrendSeries}
          />
        )}
      </div>
    </Suspense>
  )
}

export default App
