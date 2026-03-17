import { lazy, Suspense } from 'react'

import type { AtlasTab } from '../hooks/useAtlasQueryState'
import AtlasTabs from './molecules/AtlasTabs'
import InsightPanel from './InsightPanel'
import OfflineMetricsPanel from './OfflineMetricsPanel'
import ScopePanel from './ScopePanel'
import type { AtlasSidebarProps } from './atlasSidebar.types'

const ComparisonPanel = lazy(() => import('./ComparisonPanel'))
const AnomalyPanel = lazy(() => import('./organisms/AnomalyPanel'))
const SchoolDetailPanel = lazy(() => import('./organisms/SchoolDetailPanel'))

const TAB_META: Record<AtlasTab, { title: string; description: string }> = {
  welcome: { title: '歡迎使用', description: '全台教育數據分析入口。請選擇下方的分析模組開始探索。' },
  overview: { title: '全台總覽', description: '觀察全台與目前範圍的摘要、排名與整體趨勢。' },
  regional: { title: '區域分析', description: '聚焦各縣市與鄉鎮間的指標差異與下鑽分析。' },
  county: { title: '縣市分析', description: '專注單一縣市的各級教育數據與鄉鎮排行。' },
  schools: { title: '鄉鎮分析', description: '下鑽至特定鄉鎮層級，觀察校點分布與清單概況。' },
  'school-focus': { title: '校別概況', description: '單一特定學校的深度數據、趨勢與資料註記。' },
}

function AtlasSidebar({
  sidebarRef,
  activeTab,
  tabItems,
  onSetActiveTab,
  activeYear,
  isYearPlaybackActive,
  isOffline,
  activeCountyId,
  activeTownshipId,
  currentScope,
  scopePath,
  scopeHeadline,
  scopeDescription,
  educationDistribution,
  observedCounties,
  topCountyPrefetchIds,
  loadObservation,
  offlineReadyWithBuckets,
  totalCounties,
  selectedCountyName,
  topRows,
  comparisonScenarioName,
  effectiveComparisonCountyIds,
  comparisonCandidates,
  comparisonSummaries,
  favoriteScenarios,
  recentScenarios,
  activeScenarioSnapshot,
  favoriteScenarioIds,
  copyFeedbackMessage,
  scenarioFeedbackMessage,
  filteredAnomalies,
  activeInvestigation,
  selectedInvestigationId,
  investigationFilter,
  scopeNotes,
  countyDetailError,
  isCountyDetailLoading,
  schoolInsights,
  selectedSchool,
  schoolPanelTitle,
  selectedTownshipSummary,
  selectedCountySummary,
  onResetScope,
  onSelectCounty,
  onSelectTownship,
  onPrefetchCounty,
  onPrefetchAll,
  onChangeScenarioName,
  onToggleCounty,
  onCopyLink,
  onSaveScenario,
  onExportScenarios,
  onImportScenarios,
  onApplyScenario,
  onTogglePinScenario,
  onRenameScenario,
  onRemoveScenario,
  onSelectInvestigation,
  onSetFilter,
  onDownloadInvestigation,
  onDownloadAll,
  onSelectSchool,
}: AtlasSidebarProps) {
  // Intentionally unused: kept for API compatibility and future extensions.
  void onResetScope
  return (
    <aside className="atlas-sidebar" ref={sidebarRef}>
      <section className="sidebar-block sidebar-block--nav">
        <AtlasTabs activeTab={activeTab} items={tabItems} onSelectTab={onSetActiveTab} />

        <div className="sidebar-block__head">
          <div>
            <p className="eyebrow">目前頁面</p>
            <h2>{TAB_META[activeTab].title}</h2>
          </div>
        </div>
        <p className="sidebar-block__description">{TAB_META[activeTab].description}</p>
      </section>

      {activeTab === 'overview' ? (
        <div className="atlas-tab-panel" data-tab="overview">
          <ScopePanel
            scopePath={scopePath}
            scopeHeadline={scopeHeadline}
            scopeDescription={scopeDescription}
            currentScope={currentScope}
            activeYear={activeYear}
            isYearPlaybackActive={isYearPlaybackActive}
            educationDistribution={educationDistribution}
            observedCounties={observedCounties}
            topCountyPrefetchIds={topCountyPrefetchIds}
            loadObservation={loadObservation}
            offlineReadyWithBuckets={offlineReadyWithBuckets}
            onPrefetchAll={onPrefetchAll}
          />

          <InsightPanel
            title={selectedCountyName ? `${selectedCountyName} 鄉鎮排行` : '全台縣市排行'}
            subtitle={selectedCountyName ? '點擊鄉鎮即可同步切換' : '點擊縣市載入地方細節'}
            rows={topRows}
            activeRowId={activeTownshipId ?? activeCountyId}
            onSelectRow={(rowId) => {
              if (selectedCountyName) {
                onSelectTownship(rowId, { skipTabSwitch: true })
              } else {
                onSelectCounty(rowId, { skipTabSwitch: true })
              }
            }}
            onHoverRow={(rowId) => {
              if (!selectedCountyName && rowId) {
                onPrefetchCounty(rowId)
              }
            }}
            emptyMessage="目前條件沒有可顯示的排行資料。"
          />

          <OfflineMetricsPanel
            loadObservation={loadObservation}
            offlineReadySlices={offlineReadyWithBuckets}
            totalCounties={totalCounties}
            isOffline={isOffline}
          />
        </div>
      ) : null}

      {activeTab === 'regional' ? (
        <div className="atlas-tab-panel" data-tab="regional">
          <Suspense fallback={<div className="empty-state">載入區域分析…</div>}>
            <ComparisonPanel
              comparisonScenarioName={comparisonScenarioName}
              onChangeScenarioName={onChangeScenarioName}
              effectiveComparisonCountyIds={effectiveComparisonCountyIds}
              comparisonCandidates={comparisonCandidates}
              comparisonSummaries={comparisonSummaries}
              favoriteScenarios={favoriteScenarios}
              recentScenarios={recentScenarios}
              activeScenarioSnapshot={activeScenarioSnapshot}
              favoriteScenarioIds={favoriteScenarioIds}
              copyFeedback={copyFeedbackMessage}
              scenarioFeedback={scenarioFeedbackMessage}
              onToggleCounty={onToggleCounty}
              onCopyLink={onCopyLink}
              onSaveScenario={onSaveScenario}
              onExportScenarios={onExportScenarios}
              onImportScenarios={onImportScenarios}
              onApplyScenario={onApplyScenario}
              onTogglePinScenario={onTogglePinScenario}
              onRenameScenario={onRenameScenario}
              onRemoveScenario={onRemoveScenario}
            />

            <AnomalyPanel
              filteredAnomalies={filteredAnomalies}
              activeInvestigation={activeInvestigation}
              selectedInvestigationId={selectedInvestigationId}
              investigationFilter={investigationFilter}
              scopeNotes={scopeNotes}
              scopeHeadline={scopeHeadline}
              onSelectInvestigation={onSelectInvestigation}
              onSetFilter={onSetFilter}
              onDownloadInvestigation={onDownloadInvestigation}
              onDownloadAll={onDownloadAll}
            />
          </Suspense>
        </div>
      ) : null}

      {activeTab === 'schools' || activeTab === 'school-focus' ? (
        <div className="atlas-tab-panel" data-tab="schools">
          <Suspense fallback={<div className="empty-state">載入學校工作台…</div>}>
            <SchoolDetailPanel
              selectedCountyName={selectedCountyName}
              countyDetailError={countyDetailError}
              isCountyDetailLoading={isCountyDetailLoading}
              schoolInsights={schoolInsights}
              selectedSchool={selectedSchool}
              schoolPanelTitle={schoolPanelTitle}
              panelMode={activeTab === 'school-focus' ? 'focus' : 'workspace'}
              selectedTownshipSummary={selectedTownshipSummary}
              selectedCountySummary={selectedCountySummary}
              onSetWorkbenchView={() => undefined}
              onSelectSchool={onSelectSchool}
            />
          </Suspense>
        </div>
      ) : null}
    </aside>
  )
}

export default AtlasSidebar