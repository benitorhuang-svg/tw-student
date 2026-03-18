import { lazy, Suspense, type RefObject } from 'react'

import type { DataNote } from '../data/educationData'
import { formatAcademicYear, type EducationDistributionRow, type RankingSummary, type SchoolInsight, type ScopeSummary } from '../lib/analytics'
import type { TrendPoint } from '../lib/analytics.types'
import type { AtlasLoadObservationSnapshot, AcademicYear } from '../hooks/types'
import type { AtlasTab } from '../hooks/useAtlasQueryState'
import InsightPanel from './InsightPanel'
import OfflineMetricsPanel from './OfflineMetricsPanel'
import ScopePanel from './ScopePanel'
import { StackedAreaTrendChart } from './organisms/StackedAreaTrendChart'
const SchoolDetailPanel = lazy(() => import('./organisms/SchoolDetailPanel'))

const TAB_META: Record<AtlasTab, { title: string; description: string }> = {
  welcome: { title: '歡迎使用', description: '全台教育數據分析入口。請選擇下方的分析模組開始探索。' },
  overview: { title: '概況總覽', description: '掌握全台整體及目前選取範圍的核心指標，作為下鑽區域或單校分析的起點。' },
  county: { title: '縣市分析', description: '聚焦選定縣市內的鄉鎮排名與規模分佈，掌握縣內各區教育版圖位移級。' },
  schools: { title: '校別概況', description: '條列目前範圍內的學校細節清單，並提供多校間的趨勢對照與數據註記。' },
  'school-focus': { title: '單校診斷', description: '針對特定學校進行深度診斷，包含歷年走勢、同儕定位與正式數據備註。' },
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
  nationalEducationTrendSeries: Array<{ label: string, points: TrendPoint[] }>
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
              title={selectedCountyName ? `${selectedCountyName} 鄉鎮規模排名` : '全台縣市規模排名'}
              subtitle={selectedCountyName ? '點擊鄉鎮即可同步定位' : '點擊縣市即可縮小左側地圖觀察範圍'}
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
              emptyMessage="目前條件下尚無符合選取範圍的排名資料。"
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