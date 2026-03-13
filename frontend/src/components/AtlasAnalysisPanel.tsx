import { lazy, Suspense, type ChangeEventHandler, type RefObject } from 'react'

import type { DataNote } from '../data/educationData'
import { formatAcademicYear, type CountyComparisonSummary, type EducationDistributionRow, type RankingSummary, type SchoolInsight, type ScopeSummary } from '../lib/analytics'
import type { TrendPoint } from '../lib/analytics.types'
import type { AtlasLoadObservationSnapshot, AcademicYear } from '../hooks/types'
import type { InvestigationFilter, InvestigationItem, SavedComparisonScenario } from '../hooks/types'
import type { AtlasTab } from '../hooks/useAtlasQueryState'
import InsightPanel from './InsightPanel'
import OfflineMetricsPanel from './OfflineMetricsPanel'
import ScopePanel from './ScopePanel'
import StackedAreaTrendChart from './StackedAreaTrendChart'

const ComparisonPanel = lazy(() => import('./ComparisonPanel'))
const AnomalyPanel = lazy(() => import('./AnomalyPanel'))
const SchoolDetailPanel = lazy(() => import('./SchoolDetailPanel'))

const TAB_META: Record<AtlasTab, { title: string; description: string }> = {
  overview: { title: '概況總覽', description: '先看全台與目前範圍的核心指標，再決定要不要往區域或單校下鑽。' },
  regional: { title: '區域分析', description: '右側集中呈現比較卡片、異常治理與區域差異，讓地圖回到純粹的篩選角色。' },
  county: { title: '縣市分析', description: '聚焦單一縣市後，以鄉鎮排名與分布掌握縣內教育版圖，再往各校層級下鑽。' },
  schools: { title: '學校工作台', description: '只在這裡呈現學校表格、單校趨勢與正式註記，維持分析焦點單純。' },
  'school-focus': { title: '單校分析', description: '單一學校分頁專注呈現趨勢、比較基準、資料註記與外部連結。' },
}

type AtlasAnalysisPanelProps = {
  sidebarRef: RefObject<HTMLElement | null>
  activeTab: AtlasTab
  activeYear: AcademicYear
  isYearPlaybackActive: boolean
  isOffline: boolean
  activeCountyId: string | null
  activeTownshipId: string | null
  currentScope: ScopeSummary
  scopePath: string[]
  scopeHeadline: string
  scopeDescription: string
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
  totalCounties: number
  selectedCountyName: string | null
  topRows: RankingSummary[]
  comparisonScenarioName: string
  effectiveComparisonCountyIds: string[]
  comparisonCandidates: Array<{ id: string; displayName: string }>
  comparisonSummaries: CountyComparisonSummary[]
  favoriteScenarios: SavedComparisonScenario[]
  recentScenarios: SavedComparisonScenario[]
  activeScenarioSnapshot: SavedComparisonScenario | null
  favoriteScenarioIds: Set<string>
  nationalEducationTrendSeries: Array<{ label: string, points: TrendPoint[] }>
  copyFeedbackMessage: string | null
  scenarioFeedbackMessage: string | null
  filteredAnomalies: InvestigationItem[]
  activeInvestigation: InvestigationItem | null
  selectedInvestigationId: string | null
  investigationFilter: InvestigationFilter
  scopeNotes: DataNote[]
  countyDetailError: string | null
  isCountyDetailLoading: boolean
  schoolInsights: SchoolInsight[]
  selectedSchool: SchoolInsight | null
  schoolPanelTitle: string
  selectedTownshipSummary: { label: string } | null
  selectedCountySummary: { label: string } | null
  onPrefetchAll: () => void
  onSelectCounty: (countyId: string) => void
  onSelectTownship: (townshipId: string) => void
  onPrefetchCounty: (countyId: string | null) => void
  onChangeScenarioName: (value: string) => void
  onToggleCounty: (countyId: string) => void
  onCopyLink: () => void
  onSaveScenario: () => void
  onExportScenarios: () => void
  onImportScenarios: ChangeEventHandler<HTMLInputElement>
  onApplyScenario: (scenario: SavedComparisonScenario) => void
  onTogglePinScenario: (scenarioId: string) => void
  onRenameScenario: (scenarioId: string) => void
  onRemoveScenario: (scenarioId: string) => void
  onSelectInvestigation: (investigationId: string) => void
  onSetFilter: (filter: InvestigationFilter) => void
  onDownloadInvestigation: (item: InvestigationItem) => void
  onDownloadAll: () => void
  onSelectSchool: (schoolId: string | null) => void
}

function AtlasAnalysisPanel({
  sidebarRef,
  activeTab,
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
  nationalEducationTrendSeries,
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
  onPrefetchAll,
  onSelectCounty,
  onSelectTownship,
  onPrefetchCounty,
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
}: AtlasAnalysisPanelProps) {
  return (
    <main className="atlas-analysis-column" ref={sidebarRef}>
      <section className="panel analysis-hero">
        <div>
          <p className="eyebrow">分析畫布</p>
          <h2>{TAB_META[activeTab].title}</h2>
          <p>{TAB_META[activeTab].description}</p>
        </div>
        <div className="analysis-hero__meta">
          <span className="analysis-hero__chip">{formatAcademicYear(activeYear)}</span>
          <span className="analysis-hero__chip">{currentScope.label}</span>
          <span className="analysis-hero__chip">{scopePath.join(' / ')}</span>
        </div>
      </section>

      {activeTab === 'overview' ? (
        <div className="analysis-overview">
          <div className="analysis-overview__main">
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
            {activeTab === 'overview' && !activeCountyId && (
              <div style={{ marginTop: '1.25rem' }}>
                <StackedAreaTrendChart
                  title="全台各學制歷年學生數"
                  subtitle="涵蓋 108-114 學年度趨勢變化"
                  series={nationalEducationTrendSeries}
                />
                {scopeNotes.length > 0 ? (
                  <div className="note-stack" style={{ marginTop: '1rem' }} data-testid="national-scope-notes">
                    {scopeNotes.map((note) => (
                      <article key={`${note.type}-${note.message}`} className={`data-note data-note--${note.severity}`}>
                        <strong>{note.type}</strong>
                        <span>{note.message}</span>
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
          <div className="analysis-overview__side">
            <InsightPanel
              title={selectedCountyName ? `${selectedCountyName} 鄉鎮排行` : '全台縣市排行'}
              subtitle={selectedCountyName ? '點擊鄉鎮即可同步切換' : '點擊縣市即可同步縮小左側地圖範圍'}
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

            <OfflineMetricsPanel
              loadObservation={loadObservation}
              offlineReadySlices={offlineReadyWithBuckets}
              totalCounties={totalCounties}
              isOffline={isOffline}
            />
          </div>
        </div>
      ) : null}

      {activeTab === 'regional' ? (
        <div className="analysis-regional">
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
        <div className="analysis-schools">
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
    </main>
  )
}

export default AtlasAnalysisPanel