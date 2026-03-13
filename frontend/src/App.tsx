import { Suspense, lazy, useEffect, useState, useTransition } from 'react'

import './App.css'

import { useAtlasAppState } from './hooks/useAtlasAppState'
import { useAtlasLoadObservation } from './hooks/useAtlasLoadObservation'
import { useAtlasOrchestration } from './hooks/useAtlasOrchestration'
import { buildDesktopTabItems } from './hooks/atlasHelpers'
import { useEducationData } from './hooks/useEducationData'
import { useFeedbackMessage } from './hooks/useFeedbackMessage'
import { useYearPlayback } from './hooks/useYearPlayback'
import { THEME_STORAGE_KEY } from './lib/constants'

const TaiwanExplorerMap = lazy(() => import('./components/TaiwanExplorerMap'))
const DesktopAppLayout = lazy(() => import('./layouts/DesktopAppLayout'))
// const MobileAppLayout = lazy(() => import('./layouts/MobileAppLayout'))

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
    tabIsExplicitFromQuery,
    forceTownshipLabels,
    mapResetToken, setMapResetToken,
    mapZoom, setMapZoom,
    mapLat, setMapLat,
    mapLon, setMapLon,
  } = state

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
    tabIsExplicitFromQuery,
    forceTownshipLabels,
  })

  // allow tests or manual experimentation to override the feature via query
  const url = new URL(window.location.href)
  const qFlag = url.searchParams.get('vectorTiles')
  const enableVector = qFlag === 'true' || import.meta.env.VITE_USE_VECTOR_TILES === 'true'
  const initialTileUrl = enableVector
    ? import.meta.env.VITE_VECTOR_TILE_BASE_URL || '/data/tiles'
    : ''
  const [vectorTileUrl, setVectorTileUrl] = useState(initialTileUrl)

  // ── Loading / error guards ──
  // If we ever wind up with an *empty* boundary FeatureCollection it usually
  // means the front-end build was served from the wrong host (e.g. backend
  // port) and the static JSON failed to load.  Display the same failure UI so
  // users don't stare at a blank map.
  const noBoundaries = countyBoundaries &&
    Array.isArray(countyBoundaries.features) &&
    countyBoundaries.features.length === 0

  if (loadError || !summaryDataset || !countyBoundaries || noBoundaries) {
    const showLoadError = loadError || noBoundaries
    return (
      <div className="app-shell">
        <section className="hero-panel hero-panel--single"><div className="hero-panel__content">
          <p className="eyebrow">{showLoadError ? '資料載入失敗' : '正式資料準備中'}</p>
          <h1>{showLoadError ? '正式資料尚未成功載入' : '正在載入教育部與官方行政區資料'}</h1>
          <p className="hero-panel__description">{showLoadError
            ? (loadError ?? '縣市界線資料為空，請確認您是否正在瀏覽前端伺服器（預設 http://localhost:5173）')
            : '系統正在先載入全台摘要與官方縣市界線，縣市細節會在需要時按需補載。'}
          </p>
        </div></section>
      </div>
    )
  }

  const handlePrefetchCounty = (countyId: string | null) => { if (!derived.selectedCounty && countyId) prefetchCounty(countyId) }

  const handleSchoolSelect = (schoolId: string | null) => {
    const nextId = selectedSchoolId === schoolId ? null : schoolId
    startTransition(() => setSelectedSchoolId(nextId))
    setSchoolWorkbenchView(nextId ? 'analysis' : 'list')
    // if (nextId) setActiveTab('school-focus', 0)
    // else if (activeTab === 'school-focus') setActiveTab('schools', 0)
  }

  // Deep links that include zoom/lat/lon should show township labels in the
  // current viewport, even if the user did not explicitly add
  // `?forceTownshipLabels=true` to the URL.
  const shouldForceTownshipLabels =
    forceTownshipLabels ||
    (state.initialQueryState.zoom != null &&
      state.initialQueryState.lat != null &&
      state.initialQueryState.lon != null)

  const handleSchoolWorkbenchView = (view: 'list' | 'analysis' | 'notes') => {
    setSchoolWorkbenchView(view)
    // if (view === 'list') { setActiveTab('schools', 0); return }
    // if (derived.selectedSchool) setActiveTab('school-focus', 0)
  }

  const desktopTabItems = buildDesktopTabItems(region, derived.selectedCounty, derived.selectedTownshipSummary, derived.selectedSchool)

  const mapElement = (
    <TaiwanExplorerMap
      // use the unmerged list for rendering markers/boundaries
      counties={derived.mapCountySummaries}
      activeRegion={region}
      activeCountyId={derived.activeCountyId}
      activeTownshipId={derived.activeTownshipId}
      countyBoundaries={countyBoundaries}
      townshipBoundaries={derived.activeTownshipBoundaries}
      townshipRows={derived.townshipRows}
      allTownshipRows={derived.allTownshipRows}
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
      onAutoSelectCounty={scenarioActions.ensureCountySelected}
      onSelectTownship={scenarioActions.handleTownshipSelect}
      onSelectSchool={handleSchoolSelect}
      onHoverCounty={handlePrefetchCounty}
      onZoomChange={setMapZoom}
      currentMapZoom={mapZoom}
      onMoveEnd={(lat: number, lon: number) => { setMapLat(lat); setMapLon(lon) }}
      initialMapZoom={mapZoom}
      initialMapLat={mapLat}
      initialMapLon={mapLon}
      forceTownshipLabels={shouldForceTownshipLabels}
      vectorTileBaseUrl={vectorTileUrl}
      onVectorTileError={() => setVectorTileUrl('')}
      scopePath={derived.scopePath}
      onNavigateScope={scenarioActions.handleNavigateScope}
    />
  )

  return (
    <Suspense fallback={<AppLoadingShell message="正在載入台灣教育地圖與分析元件" />}>
      <div className="app-shell" data-testid="atlas-app" data-theme={theme}>
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
          isPending={isPending}
          setActiveYear={setActiveYear}
          setEducationLevel={setEducationLevel}
          setManagementType={setManagementType}
          onSetRegion={scenarioActions.handleRegionSelect}
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
      </div>
    </Suspense>
  )
}

export default App
