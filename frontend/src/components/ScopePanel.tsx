import PieChart from './PieChart'
import StatCard from './StatCard'
import TrendChart from './TrendChart'
import { formatAcademicYear, formatDelta, formatFileSize, formatPercent, formatStudents, type TrendPoint } from '../lib/analytics'
import type { AcademicYear, AtlasLoadObservationSnapshot } from '../hooks/types'

type ScopeSummary = {
  label: string
  students: number
  schools: number
  delta: number
  deltaRatio: number
  trend: TrendPoint[]
}

type EducationDistRow = {
  level: string
  students: number
  share: number
}

type ObservedCounty = {
  id: string
  name: string
}

type ScopePanelProps = {
  scopePath: string[]
  scopeHeadline: string
  scopeDescription: string
  currentScope: ScopeSummary
  activeYear: AcademicYear
  isYearPlaybackActive: boolean
  educationDistribution: EducationDistRow[]
  observedCounties: ObservedCounty[]
  topCountyPrefetchIds: string
  loadObservation: AtlasLoadObservationSnapshot
  offlineReadyWithBuckets: number
  onPrefetchAll: () => void
}

function ScopePanel({
  scopePath,
  scopeHeadline,
  scopeDescription,
  currentScope,
  activeYear,
  isYearPlaybackActive,
  educationDistribution,
  observedCounties,
  topCountyPrefetchIds,
  loadObservation,
  offlineReadyWithBuckets,
  onPrefetchAll,
}: ScopePanelProps) {
  return (
    <>
      <section className="panel scope-panel">
        <div className="scope-breadcrumbs" data-testid="scope-breadcrumbs">
          {scopePath.map((step) => (
            <span key={step}>{step}</span>
          ))}
        </div>

        <div className="scope-panel__header">
          <div>
            <p className="eyebrow">目前工作範圍</p>
            <h2>{scopeHeadline}</h2>
            <p>{scopeDescription}</p>
          </div>
          <div className="scope-panel__playback">
            <strong>{formatAcademicYear(activeYear)}</strong>
            <span>{isYearPlaybackActive ? '動畫播放中' : '靜態檢視中'}</span>
          </div>
        </div>

        <div className="stat-grid stat-grid--top">
          <div data-testid="current-scope-card">
            <StatCard
              title={currentScope.label}
              value={`${formatStudents(currentScope.students)} 人`}
              caption={`${currentScope.schools.toLocaleString('zh-TW')} 校 | ${formatDelta(currentScope.delta)} / ${formatPercent(currentScope.deltaRatio)}`}
              tone="lagoon"
            />
          </div>
          <StatCard
            title="正式資料覆蓋"
            value={`${observedCounties.length.toLocaleString('zh-TW')} 縣市`}
            caption={`前 3 名預抓鍵: ${topCountyPrefetchIds || '已切入縣市模式'}`}
            tone="sun"
          />
          <StatCard
            title="快取傳輸"
            value={formatFileSize(loadObservation.totalTransferredBytes)}
            caption={`記憶體 ${loadObservation.memoryHits} / IndexedDB ${loadObservation.indexedDbHits} / 快取命中 ${loadObservation.cacheHits}`}
            tone="coral"
          />
        </div>

        <PieChart slices={educationDistribution.map((row) => ({ label: row.level, value: row.students, share: row.share }))} />

        <div className="scope-panel__actions">
          <button type="button" className="ghost-button" onClick={onPrefetchAll}>
            預載入全部縣市（離線用）
          </button>
          <span className="scope-panel__actions-meta">已快取 {offlineReadyWithBuckets} 份切片</span>
        </div>
      </section>

      <TrendChart chartId="scope-trend" title={`${currentScope.label} 歷年學生數`} subtitle="年度播放模式會同步驅動這張折線圖" points={currentScope.trend} activeYear={activeYear} />
    </>
  )
}

export default ScopePanel
