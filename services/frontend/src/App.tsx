import { Suspense, lazy, useCallback, useEffect, useMemo, useState, useTransition } from 'react'

import './App.css'

import { useAtlasAppState } from './hooks/useAtlasAppState'
import { useAtlasLoadObservation } from './hooks/useAtlasLoadObservation'
import { useAtlasOrchestration } from './hooks/useAtlasOrchestration'
import { buildDesktopTabItems } from './hooks/atlasHelpers'
import { useEducationData } from './hooks/useEducationData'
import { useFeedbackMessage } from './hooks/useFeedbackMessage'
import { useYearPlayback } from './hooks/useYearPlayback'
import { useIsMobile } from './hooks/useIsMobile'
import { THEME_STORAGE_KEY } from './lib/constants'
import { AppLoadingShell, AppErrorShell } from './components/AppStatusShell'

const TaiwanExplorerMap = lazy(() => import('./components/TaiwanExplorerMap'))
const DesktopAppLayout = lazy(() => import('./layouts/DesktopAppLayout'))
const MobileAppLayout = lazy(() => import('./layouts/MobileAppLayout'))

function App() {
  const isMobile = useIsMobile()
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

  // 5. Action Handlers
  const handlePrefetchCounty = useCallback((countyId: string | null, viewport?: { bounds?: [number, number, number, number]; zoom?: number }) => {
    if (countyId) {
      prefetchCounty(countyId, viewport)
    }
  }, [prefetchCounty])

  const handleSchoolSelect = useCallback((schoolId: string | null) => {
    scenarioActions.handleSchoolSelect(schoolId, { skipTabSwitch: true })
    if (schoolId) {
      state.setSchoolWorkbenchView('analysis')
    }
  }, [scenarioActions, state])

  // 6. UI Composition
  const shouldForceTownshipLabels = state.forceTownshipLabels || (state.initialQueryState.zoom != null && state.initialQueryState.lat != null && state.initialQueryState.lon != null)
  const desktopTabItems = buildDesktopTabItems(derived.selectedCounty, derived.selectedTownshipSummary, derived.selectedSchool)

  const mapElement = useMemo(
    () => {
      if (!summaryDataset || !countyBoundaries) {
        return null
      }

      return (
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
          isYearPlaybackActive={isYearPlaybackActive}
          onTogglePlayback={() => setIsYearPlaybackActive(!isYearPlaybackActive)}
          activeCountyName={derived.selectedCounty?.name ?? null}
          summaryDataset={summaryDataset}
          currentTrend={derived.currentScope?.trend ?? []}
          currentLabel={derived.currentScope?.label ?? '全台'}
          currentLevel={derived.currentScope?.scopeLevel ?? '全台'}
        />
      )
    },
    [
      countyBoundaries,
      derived,
      handlePrefetchCounty,
      handleSchoolSelect,
      scenarioActions,
      shouldForceTownshipLabels,
      startTransition,
      state,
      setIsYearPlaybackActive,
      isYearPlaybackActive,
      summaryDataset,
      vectorTileUrl,
    ],
  )

  // 4. Loading & Error Checks
  const noBoundaries = countyBoundaries?.features?.length === 0
  if (loadError || noBoundaries) {
    return (
      <AppErrorShell 
        eyebrow="資料載入失敗"
        title="正式資料尚未成功載入"
        description={loadError || '縣市界線資料為空，請確認主機設定。'}
      />
    )
  }

  if (!summaryDataset || !countyBoundaries) {
    return <AppLoadingShell message="正在載入教育部與官方行政區資料" />
  }

  if (isMobile) {
    return (
      <Suspense fallback={<AppLoadingShell message="正在載入行動版地圖..." />}>
        <div className="app-shell" data-testid="atlas-app" data-theme={state.theme}>
          <MobileAppLayout
            {...state}
            activeCountyId={state.selectedCountyId}
            activeTownshipId={state.selectedTownshipId}
            map={mapElement}
            tabItems={desktopTabItems}
            onSetActiveTab={state.setActiveTab}
            scopePath={derived.scopePath}
            scopeHeadline={derived.selectedCounty?.name ?? '全台'}
            scopeDescription={derived.selectedTownshipSummary?.label || '請選擇區域'}
            currentScope={derived.currentScope}
            summaryYears={[...summaryDataset.years]}
            isYearPlaybackActive={isYearPlaybackActive}
            isPending={isPending}
            startTransition={startTransition}
            countyQuickPicks={derived.mapCountySummaries.map(c => ({ id: c.id, name: c.name }))}
            onSetActiveYear={state.setActiveYear}
            onSetEducationLevel={state.setEducationLevel}
            onSetManagementType={state.setManagementType}
            onSetRegion={state.setRegion}
            onSetIsYearPlaybackActive={setIsYearPlaybackActive}
            onResetScope={scenarioActions.handleResetScope}
            onSelectCounty={scenarioActions.handleCountySelect}
            onSelectTownship={scenarioActions.handleTownshipSelect}
            onPrefetchCounty={handlePrefetchCounty}
            educationDistribution={derived.educationDistribution}
            observedCounties={derived.observedCounties}
            topCountyPrefetchIds={derived.topCountyPrefetchIds}
            loadObservation={loadObservation}
            offlineReadyWithBuckets={derived.offlineReadyWithBuckets}
            selectedCountyName={derived.selectedCounty?.name ?? null}
            topRows={derived.topRows}
            onPrefetchAll={() => {}}
            comparisonScenarioName={activeScenarioSnapshot?.name ?? ''}
            effectiveComparisonCountyIds={activeScenarioSnapshot?.countyIds ?? []}
            comparisonCandidates={[]}
            comparisonSummaries={[]}
            favoriteScenarios={[]}
            recentScenarios={[]}
            activeScenarioSnapshot={activeScenarioSnapshot}
            favoriteScenarioIds={new Set()}
            copyFeedbackMessage={copyFeedback.message}
            scenarioFeedbackMessage={scenarioFeedback.message}
            filteredAnomalies={[]}
            activeInvestigation={null}
            selectedInvestigationId={null}
            investigationFilter="全部"
            scopeNotes={[]}
            onChangeScenarioName={() => {}}
            onToggleCounty={() => {}}
            onCopyLink={() => {}}
            onSaveScenario={() => {}}
            onExportScenarios={() => {}}
            onImportScenarios={() => {}}
            onApplyScenario={() => {}}
            onTogglePinScenario={() => {}}
            onRenameScenario={() => {}}
            onRemoveScenario={() => {}}
            onSelectInvestigation={() => {}}
            onSetFilter={() => {}}
            onDownloadInvestigation={() => {}}
            onDownloadAll={() => {}}
            countyDetailError={educationData.countyDetailError}
            isCountyDetailLoading={educationData.isRefreshingData}
            schoolInsights={[]}
            selectedSchool={null}
            schoolPanelTitle=""
            selectedTownshipSummary={derived.selectedTownshipSummary}
            selectedCountySummary={derived.selectedCounty ? { label: derived.selectedCounty.name } : null}
            onSelectSchool={handleSchoolSelect}
          />
        </div>
      </Suspense>
    )
  }

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
          townshipBoundaryCache={educationData.townshipBoundaryCache}
          countyDetailError={educationData.countyDetailError}
          
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
