import ComparisonBarChart from './ComparisonBarChart'
import PRIndicatorChart from './PRIndicatorChart'
import SchoolCompositionChart from './SchoolCompositionChart'
import SchoolOverviewChart from './SchoolOverviewChart'
import TrendChart from './TrendChart'
import type { SchoolCodeAtlasEntry } from '../data/educationData'
import { formatDelta, formatStudents, type SchoolInsight } from '../lib/analytics'
import type { TrendPoint } from '../lib/analytics.types'
import type { AcademicYear } from '../hooks/types'

type BenchmarkView = 'township' | 'county' | 'peers'
type TrendMetric = 'students' | 'delta' | 'ratio'

export function SchoolAnalysisOverviewSection(props: {
  selectedSchool: SchoolInsight
  activeYear: AcademicYear
  selectedSchoolRank: number
  scopeLabel: string
  schoolAtlasEntry: SchoolCodeAtlasEntry | null
  isSchoolAtlasLoading: boolean
  schoolAtlasError: string | null
  peerRankingItems: Array<{ id: string; label: string; value: number }>
  highlightedSchoolId?: string | null
  onHoverSchool?: (schoolId: string | null) => void
  onSelectSchool: (schoolId: string | null) => void
  schoolProfileFacts: Array<{ label: string; value: string }>
}) {
  const { selectedSchool, activeYear, selectedSchoolRank, scopeLabel, schoolAtlasEntry, isSchoolAtlasLoading, schoolAtlasError, peerRankingItems, highlightedSchoolId = null, onHoverSchool, onSelectSchool, schoolProfileFacts } = props
  return (
    <div className="school-chart-panel__section school-chart-panel__section--overview">
      <div className="school-moe-board">
        <div className="school-moe-board__header">
          <div>
            <p className="eyebrow eyebrow--cyan">公部門儀表板視野</p>
            <h3>{selectedSchool.name}（{activeYear}學年度）</h3>
          </div>
          <p className="panel-heading__meta">參考教育部校別概況的閱讀動線，從單校歷年變數、基本資料到同段比較。</p>
        </div>

        <div className="school-moe-board__grid">
          <div className="school-moe-board__chart-card">
            <SchoolOverviewChart
              trend={selectedSchool.trend}
              activeYear={activeYear}
              schoolName={selectedSchool.name}
              schoolCode={selectedSchool.code}
              educationLevel={selectedSchool.educationLevel}
              managementType={selectedSchool.managementType}
              address={selectedSchool.address}
              phone={selectedSchool.phone}
              website={selectedSchool.website}
            />
          </div>

          <aside className="school-ranking-rail">
            <div className="school-ranking-rail__header">
              <p className="eyebrow">學校排名</p>
              <h4>{selectedSchool.educationLevel} 前段比較</h4>
            </div>
            <div className="school-ranking-rail__hero">
              <strong>#{selectedSchoolRank}</strong>
              <span>{scopeLabel} / {selectedSchool.educationLevel}</span>
              <small>目前學生數 {formatStudents(selectedSchool.currentStudents)} 人</small>
            </div>
            <ComparisonBarChart
              items={peerRankingItems.length > 0 ? peerRankingItems : [{ id: selectedSchool.id, label: selectedSchool.name, value: selectedSchool.currentStudents }]}
              activeItemId={highlightedSchoolId ?? selectedSchool.id}
              onHoverItem={peerRankingItems.length > 0 ? onHoverSchool : undefined}
              onSelectItem={peerRankingItems.length > 0 ? (schoolId) => onSelectSchool(schoolId) : undefined}
            />
          </aside>
        </div>

        <div className="school-moe-board__composition-card">
          <SchoolCompositionChart
            schoolAtlasEntry={schoolAtlasEntry}
            selectedSchool={selectedSchool}
            activeYear={activeYear}
            isLoading={isSchoolAtlasLoading}
            loadError={schoolAtlasError}
          />
        </div>

        <div className="school-profile-facts-grid">
          {schoolProfileFacts.map((fact) => (
            <div key={fact.label} className="school-profile-fact">
              <span>{fact.label}</span>
              {fact.label === '網站' && selectedSchool.website ? (
                <a className="school-profile-link" href={selectedSchool.website} target="_blank" rel="noreferrer">{fact.value}</a>
              ) : (
                <strong>{fact.value}</strong>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SchoolAnalysisTrendSection(props: {
  selectedSchool: SchoolInsight
  activeYear: AcademicYear
  trendMetric: TrendMetric
  onSetTrendMetric: (metric: TrendMetric) => void
  trendPoints: TrendPoint[]
  benchmarkPoints: TrendPoint[]
}) {
  const { selectedSchool, activeYear, trendMetric, onSetTrendMetric, trendPoints, benchmarkPoints } = props
  return (
    <div className="school-chart-panel__section">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">趨勢切換</p>
          <h3>{selectedSchool.name} 趨勢圖</h3>
        </div>
        <div className="chart-pill-row" role="tablist" aria-label="單校趨勢指標切換">
          <button type="button" role="tab" aria-selected={trendMetric === 'students'} className={trendMetric === 'students' ? 'chip chip--active' : 'chip'} onClick={() => onSetTrendMetric('students')}>學生數</button>
          <button type="button" role="tab" aria-selected={trendMetric === 'delta'} className={trendMetric === 'delta' ? 'chip chip--active' : 'chip'} onClick={() => onSetTrendMetric('delta')}>今年增減</button>
          <button type="button" role="tab" aria-selected={trendMetric === 'ratio'} className={trendMetric === 'ratio' ? 'chip chip--active' : 'chip'} onClick={() => onSetTrendMetric('ratio')}>成長率</button>
        </div>
      </div>
      <TrendChart
        chartId="school-trend"
        title={`${selectedSchool.name}${trendMetric === 'students' ? ' 歷年學生數' : trendMetric === 'delta' ? ' 歷年今年增減' : ' 歷年成長率'}`}
        subtitle="同一張圖表容器支援學生數、今年增減與成長率三態切換，並對照同學制平均。"
        points={trendPoints}
        benchmarkPoints={benchmarkPoints}
        activeYear={activeYear}
        formatValue={trendMetric === 'ratio' ? (value) => `${value.toFixed(1)}%` : (value) => `${formatDelta(Math.round(value))} 人`}
        benchmarkLabel="同學制平均"
        predictionLabel="趨勢預測"
      />
    </div>
  )
}

export function SchoolAnalysisRankingSection(props: {
  selectedSchool: SchoolInsight
  selectedTownshipSummary: { label: string } | null
  activeBenchmarkView: BenchmarkView
  onSetActiveBenchmarkView: (view: BenchmarkView) => void
  benchmarkItems: Array<{ id: string; label: string; value: number }>
  highlightedSchoolId?: string | null
  onHoverSchool?: (schoolId: string | null) => void
  onSelectSchool: (schoolId: string | null) => void
}) {
  const { selectedSchool, selectedTownshipSummary, activeBenchmarkView, onSetActiveBenchmarkView, benchmarkItems, highlightedSchoolId = null, onHoverSchool, onSelectSchool } = props
  return (
    <div className="school-chart-panel__section">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">基準切換</p>
          <h3>{selectedSchool.name} 比較基準</h3>
        </div>
        <div className="chart-pill-row" role="tablist" aria-label="單校比較基準切換">
          <button type="button" role="tab" aria-selected={activeBenchmarkView === 'township'} className={activeBenchmarkView === 'township' ? 'chip chip--active' : 'chip'} onClick={() => onSetActiveBenchmarkView('township')}>{selectedTownshipSummary ? '鄉鎮平均' : '目前範圍平均'}</button>
          <button type="button" role="tab" aria-selected={activeBenchmarkView === 'county'} className={activeBenchmarkView === 'county' ? 'chip chip--active' : 'chip'} onClick={() => onSetActiveBenchmarkView('county')}>縣市平均</button>
          <button type="button" role="tab" aria-selected={activeBenchmarkView === 'peers'} className={activeBenchmarkView === 'peers' ? 'chip chip--active' : 'chip'} onClick={() => onSetActiveBenchmarkView('peers')}>同學制前 10 校</button>
        </div>
      </div>
      <ComparisonBarChart
        items={benchmarkItems}
        activeItemId={highlightedSchoolId ?? selectedSchool.id}
        onHoverItem={activeBenchmarkView === 'peers' ? onHoverSchool : undefined}
        onSelectItem={activeBenchmarkView === 'peers' ? (schoolId) => onSelectSchool(schoolId) : undefined}
      />
    </div>
  )
}

export function SchoolAnalysisPositioningSection(props: {
  selectedSchool: SchoolInsight
  scopeLabel: string
  cohortRank: number
  cohortCount: number
  scopeAverage: number
  scopeMedian: number
  sortedSchoolsMax: number
}) {
  const { selectedSchool, scopeLabel, cohortRank, cohortCount, scopeAverage, scopeMedian, sortedSchoolsMax } = props
  return (
    <div className="school-chart-panel__section">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">規模定位</p>
          <h3>{selectedSchool.name} 在 {scopeLabel} 的位置</h3>
        </div>
        <p className="panel-heading__meta">用單校、平均、中位數與最高值快速判讀目前規模。</p>
      </div>
      <div className="school-positioning-grid">
        <PRIndicatorChart
          schoolName={selectedSchool.name}
          rank={cohortRank}
          total={cohortCount}
          scopeLabel={`${selectedSchool.countyName} ${selectedSchool.educationLevel}`}
        />
        <ComparisonBarChart
          items={[
            { id: 'selected', label: '目前學校', value: selectedSchool.currentStudents },
            { id: 'average', label: '範圍平均', value: scopeAverage },
            { id: 'median', label: '範圍中位數', value: scopeMedian },
            { id: 'max', label: '範圍最高值', value: sortedSchoolsMax },
          ]}
          activeItemId="selected"
        />
      </div>
    </div>
  )
}
