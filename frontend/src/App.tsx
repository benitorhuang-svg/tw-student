import { Suspense, lazy, useDeferredValue, useMemo, useTransition } from 'react'

import './App.css'
import { useAtlasOrchestration, useEducationData, useYearPlayback } from '@/app/providers'
import { useAtlasStore } from '@/app/store'
import { useThemeSync } from '@/app/hooks/useThemeSync'
import { useVectorTileUrl } from '@/app/hooks/useVectorTileUrl'
import { useAtlasLoadObservation, buildDesktopTabItems, AppLoadingShell, AppErrorShell, loadTaiwanExplorerMap } from '@/domains/atlas'
import { useFeedbackMessage } from '@/shared/lib/hooks/core/useFeedbackMessage'
import { useIsMobile } from '@/shared/lib/hooks/core/useIsMobile'
import { useEvent } from '@/shared/lib/hooks/core/useEvent'

const TaiwanExplorerMap = lazy(loadTaiwanExplorerMap)
const DesktopAppLayout = lazy(() => import('@/app/layouts/DesktopAppLayout'))
const MobileAppLayout = lazy(() => import('@/app/layouts/MobileAppLayout'))

function App() {
  const isMobile = useIsMobile()
  const state = useAtlasStore()
  const [vectorTileUrl, setVectorTileUrl] = useVectorTileUrl()

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

  useThemeSync(state.theme)

  const deferredSearchText = useDeferredValue(state.searchText)

  // 3. Orchestration Layer
  const { derived, scenarioActions, activeScenarioSnapshot } = useAtlasOrchestration({
    ...state,
    deferredSearchText,
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
  const handlePrefetchCounty = useEvent((countyId: string | null, viewport?: { bounds?: [number, number, number, number]; zoom?: number }) => {
    if (countyId) {
      prefetchCounty(countyId, viewport)
    }
  })

  const handleSchoolSelect = useEvent((schoolId: string | null) => {
    scenarioActions.handleSchoolSelect(schoolId, { skipTabSwitch: true })
    if (schoolId) {
      state.setSchoolWorkbenchView('analysis')
    }
  })

  const handleCountySelect = useEvent(scenarioActions.handleCountySelect)
  const handleTownshipSelect = useEvent(scenarioActions.handleTownshipSelect)
  const handleNavigateScope = useEvent(scenarioActions.handleNavigateScope)
  const handleRegionSelect = useEvent(scenarioActions.handleRegionSelect)
  const handleResetScope = useEvent(scenarioActions.handleResetScope)

  const handleZoomChange = useEvent(state.setMapZoom)
  const handleMoveEnd = useEvent((lat: number, lon: number) => { state.setMapLat(lat); state.setMapLon(lon) })
  const handleVectorTileError = useEvent(() => setVectorTileUrl(''))

  const handleStopPlayback = useEvent(() => setIsYearPlaybackActive(false))
  const handleTogglePlayback = useEvent(() => setIsYearPlaybackActive(!isYearPlaybackActive))

  // 6. UI Composition
  const shouldForceTownshipLabels = state.forceTownshipLabels || (state.initialQueryState.zoom != null && state.initialQueryState.lat != null && state.initialQueryState.lon != null)
  const desktopTabItems = buildDesktopTabItems(derived.selectedCounty, derived.selectedTownshipSummary, derived.selectedSchool)

  const currentScopeLevel = 'scopeLevel' in (derived.currentScope || {}) ? (derived.currentScope as unknown as { scopeLevel: string }).scopeLevel : null;

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
          onSelectCounty={handleCountySelect}
          onSelectTownship={handleTownshipSelect}
          onSelectSchool={handleSchoolSelect}
          onHoverCounty={handlePrefetchCounty}
          onZoomChange={handleZoomChange}
          currentMapZoom={state.mapZoom}
          onMoveEnd={handleMoveEnd}
          initialMapZoom={state.mapZoom}
          initialMapLat={state.mapLat}
          initialMapLon={state.mapLon}
          forceTownshipLabels={shouldForceTownshipLabels}
          vectorTileBaseUrl={vectorTileUrl}
          onVectorTileError={handleVectorTileError}
          scopePath={derived.scopePath}
          onNavigateScope={handleNavigateScope}
          activeYear={state.activeYear}
          summaryYears={[...summaryDataset.years]}
          educationLevel={state.educationLevel}
          managementType={state.managementType}
          onSetRegion={handleRegionSelect}
          onResetRegion={handleResetScope}
          onSetActiveYear={state.setActiveYear}
          onStopPlayback={handleStopPlayback}
          onSetEducationLevel={state.setEducationLevel}
          onSetManagementType={state.setManagementType}
          startTransition={startTransition}
          isYearPlaybackActive={isYearPlaybackActive}
          onTogglePlayback={handleTogglePlayback}
          activeCountyName={derived.selectedCounty?.name ?? null}
          summaryDataset={summaryDataset}
          currentTrend={derived.currentScope?.trend ?? []}
          currentLabel={derived.currentScope?.label ?? '全台'}
          currentLevel={currentScopeLevel ?? '全台'}
        />
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      countyBoundaries,
      derived.mapCountySummaries, derived.activeCountyId, derived.activeTownshipId, derived.activeTownshipBoundaries,
      derived.townshipRows, derived.allTownshipRows, derived.allTownshipBoundaries, derived.schoolMapPoints,
      derived.activeCountyBuckets, derived.selectedSchool?.id, derived.isTownshipBoundaryLoading,
      derived.scopePath, derived.selectedCounty?.name, derived.currentScope?.trend, derived.currentScope?.label,
      currentScopeLevel,
      state.region, state.hoveredCountyId, state.hoveredTownshipId, state.hoveredSchoolId,
      state.activeTab, state.theme, state.mapResetToken, state.mapZoom, state.mapLat, state.mapLon,
      state.activeYear, state.educationLevel, state.managementType,
      handlePrefetchCounty, handleSchoolSelect, handleCountySelect, handleTownshipSelect,
      handleNavigateScope, handleRegionSelect, handleResetScope, handleZoomChange,
      handleMoveEnd, handleVectorTileError, handleStopPlayback, handleTogglePlayback,
      shouldForceTownshipLabels, startTransition, isYearPlaybackActive, summaryDataset, vectorTileUrl,
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
            map={mapElement}
            summaryYears={[...summaryDataset.years]}
            isYearPlaybackActive={isYearPlaybackActive}
            isPending={isPending}
            startTransition={startTransition}
            countyQuickPicks={derived.mapCountySummaries.map(c => ({ id: c.id, name: c.name }))}
            onSetIsYearPlaybackActive={setIsYearPlaybackActive}
            onResetScope={scenarioActions.handleResetScope}
            onSelectCounty={scenarioActions.handleCountySelect}
            onPrefetchCounty={handlePrefetchCounty}
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
