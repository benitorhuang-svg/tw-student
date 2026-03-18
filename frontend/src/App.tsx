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
import { AppLoadingShell, AppErrorShell } from './components/AppStatusShell'

const TaiwanExplorerMap = lazy(() => import('./components/TaiwanExplorerMap'))
const DesktopAppLayout = lazy(() => import('./layouts/DesktopAppLayout'))

function App() {
  const state = useAtlasAppState()
  
  const [vectorTileUrl, setVectorTileUrl] = useState(() => {
    const url = new URL(window.location.href)
    const qFlag = url.searchParams.get('vectorTiles')
    const enableVector = qFlag === 'true' || import.meta.env.VITE_USE_VECTOR_TILES === 'true'
    return enableVector ? import.meta.env.VITE_VECTOR_TILE_BASE_URL || '/data/tiles' : ''
  })

  const loadObservation = useAtlasLoadObservation()
  const [isPending, startTransition] = useTransition()
  const copyFeedback = useFeedbackMessage()
  const scenarioFeedback = useFeedbackMessage()

  // 1. Data Layer
  const educationData = useEducationData(state.selectedCountyId)
  const {
    summaryDataset, countyBoundaries, loadError, prefetchCounty
  } = educationData

  // 2. Playback Layer
  const [isYearPlaybackActive, setIsYearPlaybackActive] = useYearPlayback(summaryDataset, state.setActiveYear, startTransition)

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, state.theme)
    // Synchronize theme to body for global components like tooltips
    document.body.setAttribute('data-theme', state.theme)
  }, [state.theme])

  // 3. Orchestration Layer
  const { derived, scenarioActions, activeScenarioSnapshot } = useAtlasOrchestration({
    ...state,
    setActiveYear: state.setActiveYear,
    setEducationLevel: state.setEducationLevel,
    setManagementType: state.setManagementType,
    setRegion: state.setRegion,
    setSelectedCountyId: state.setSelectedCountyId,
    setSelectedTownshipId: state.setSelectedTownshipId,
    setSelectedSchoolId: state.setSelectedSchoolId,
    setMapResetToken: state.setMapResetToken,
    setActiveTab: state.setActiveTab,
    setMapZoom: state.setMapZoom,
    setMapLat: state.setMapLat,
    setMapLon: state.setMapLon,
    startTransition, copyFeedback, scenarioFeedback,
    educationData, loadObservation,
  })

  // 4. Loading & Error Checks
  const noBoundaries = countyBoundaries?.features?.length === 0
  if (loadError || !summaryDataset || !countyBoundaries || noBoundaries) {
    return (
      <AppErrorShell 
        eyebrow={loadError || noBoundaries ? '資料載入失敗' : '正式資料準備中'}
        title={loadError || noBoundaries ? '正式資料尚未成功載入' : '正在載入教育部與官方行政區資料'}
        description={loadError || (noBoundaries ? '縣市界線資料為空，請確認主機設定。' : '系統正在載入全台摘要中...')}
      />
    )
  }

  // 5. Action Handlers
  const handlePrefetchCounty = (countyId: string | null) => { if (countyId) prefetchCounty(countyId) }
  const handleSchoolSelect = (schoolId: string | null) => {
    scenarioActions.handleSchoolSelect(schoolId, { skipTabSwitch: true })
    if (schoolId) state.setSchoolWorkbenchView('analysis')
  }

  // 6. UI Composition
  const shouldForceTownshipLabels = state.forceTownshipLabels || (state.initialQueryState.zoom != null && state.initialQueryState.lat != null && state.initialQueryState.lon != null)
  const desktopTabItems = buildDesktopTabItems(derived.selectedCounty, derived.selectedTownshipSummary, derived.selectedSchool)

  const mapElement = (
    <TaiwanExplorerMap
      counties={derived.mapCountySummaries}
      activeRegion={state.region}
      activeCountyId={derived.activeCountyId}
      activeTownshipId={derived.activeTownshipId}
      countyBoundaries={countyBoundaries}
      townshipBoundaries={derived.activeTownshipBoundaries}
      townshipRows={derived.townshipRows}
      allTownshipRows={derived.allTownshipRows}
      allTownshipBoundaries={derived.allTownshipBoundaries}
      schoolPoints={derived.schoolMapPoints}
      countyBuckets={derived.activeCountyBuckets}
      selectedSchoolId={derived.selectedSchool?.id ?? null}
      highlightedCountyId={state.hoveredCountyId}
      highlightedTownshipId={state.hoveredTownshipId}
      highlightedSchoolId={state.hoveredSchoolId}
      isTownshipBoundaryLoading={derived.isTownshipBoundaryLoading}
      activeTab={state.activeTab}
      theme={state.theme}
      mapResetToken={state.mapResetToken}
      onSelectCounty={scenarioActions.handleCountySelect}
      onAutoSelectCounty={scenarioActions.ensureCountySelected}
      onSelectTownship={scenarioActions.handleTownshipSelect}
      onSelectSchool={handleSchoolSelect}
      onHoverCounty={handlePrefetchCounty}
      onZoomChange={state.setMapZoom}
      currentMapZoom={state.mapZoom}
      onMoveEnd={(lat: number, lon: number) => { state.setMapLat(lat); state.setMapLon(lon) }}
      initialMapZoom={state.mapZoom}
      initialMapLat={state.mapLat}
      initialMapLon={state.mapLon}
      forceTownshipLabels={shouldForceTownshipLabels}
      vectorTileBaseUrl={vectorTileUrl}
      onVectorTileError={() => setVectorTileUrl('')}
      scopePath={derived.scopePath}
      onNavigateScope={scenarioActions.handleNavigateScope}
      activeYear={state.activeYear}
      summaryYears={[...summaryDataset.years]}
      educationLevel={state.educationLevel}
      managementType={state.managementType}
      onSetRegion={scenarioActions.handleRegionSelect}
      onResetRegion={scenarioActions.handleResetScope}
      onSetActiveYear={state.setActiveYear}
      onStopPlayback={() => setIsYearPlaybackActive(false)}
      onSetEducationLevel={state.setEducationLevel}
      onSetManagementType={state.setManagementType}
      startTransition={startTransition}
      activeCountyName={derived.selectedCounty?.name ?? null}
      summaryDataset={summaryDataset}
    />
  )

  return (
    <Suspense fallback={<AppLoadingShell message="正在載入台灣教育地圖與分析元件" />}>
      <div className="app-shell" data-testid="atlas-app" data-theme={state.theme}>
        <DesktopAppLayout
          {...state}
          summaryDataset={summaryDataset}
          countyBoundaries={countyBoundaries}
          localManifest={educationData.localManifest}
          remoteManifest={educationData.remoteManifest}
          validationReport={educationData.validationReport}
          refreshSummary={educationData.refreshSummary}
          isRefreshingData={educationData.isRefreshingData}
          refreshStatus={educationData.refreshStatus}
          refreshData={educationData.refreshData}
          countyDetailCache={educationData.countyDetailCache}
          countyBucketCache={educationData.countyBucketCache}
          countySchoolAtlasCache={educationData.countySchoolAtlasCache}
          townshipBoundaryCache={educationData.townshipBoundaryCache}
          countyDetailError={educationData.countyDetailError}
          countySchoolAtlasError={educationData.countySchoolAtlasError}
          
          derived={derived}
          isPending={isPending}
          onSetRegion={scenarioActions.handleRegionSelect}
          setIsYearPlaybackActive={setIsYearPlaybackActive}
          startTransition={startTransition}
          desktopTabItems={desktopTabItems}
          mapElement={mapElement}
          isYearPlaybackActive={isYearPlaybackActive}
          activeScenarioSnapshot={activeScenarioSnapshot}
          copyFeedbackMessage={copyFeedback.message}
          scenarioFeedbackMessage={scenarioFeedback.message}
          onSetSchoolWorkbenchView={(view) => state.setSchoolWorkbenchView(view)}
          scenarioActions={scenarioActions}
          handlePrefetchCounty={handlePrefetchCounty}
          handleSchoolSelect={handleSchoolSelect}
          setHoveredSchoolId={state.setHoveredSchoolId}
          nationalEducationTrendSeries={derived.nationalEducationTrendSeries}
        />
      </div>
    </Suspense>
  )
}

export default App
