import { useMemo, useState } from 'react'
import {
  SchoolAnalysisOverviewSection,
  SchoolAnalysisPositioningSection,
  SchoolAnalysisRankingSection,
  SchoolAnalysisTrendSection,
} from './SchoolAnalysisSections'
import type { SchoolCodeAtlasEntry } from '../data/educationData'
import { formatAcademicYear, formatDelta, formatPercent, formatStudents, type SchoolInsight } from '../lib/analytics'
import type { AcademicYear } from '../hooks/types'
import type { TrendPoint } from '../lib/analytics.types'

function buildTrendMetricSeries(trend: TrendPoint[], metric: 'students' | 'delta' | 'ratio') {
  return trend.map((point, index) => {
    if (metric === 'students') {
      return point
    }

    const previousPoint = trend[index - 1]
    const delta = previousPoint ? point.value - previousPoint.value : 0
    if (metric === 'delta') {
      return { year: point.year, value: delta }
    }

    const ratio = previousPoint && previousPoint.value > 0 ? delta / previousPoint.value : 0
    return { year: point.year, value: Number((ratio * 100).toFixed(2)) }
  })
}

type SchoolAnalysisViewProps = {
  selectedSchool: SchoolInsight; activeYear: AcademicYear
  schoolAtlasEntry?: SchoolCodeAtlasEntry | null
  isSchoolAtlasLoading?: boolean
  schoolAtlasError?: string | null
  scopeLabel: string; scopeAverage: number; scopeMedian: number; countyAverage: number
  selectedSchoolRank: number; sortedSchoolsCount: number; sortedSchoolsMax: number
  cohortRank: number; cohortCount: number
  peerSchools: SchoolInsight[]
  selectedTownshipSummary: { label: string } | null
  highlightedSchoolId?: string | null
  onHoverSchool?: (schoolId: string | null) => void
  onSelectSchool: (schoolId: string | null) => void
  onSetWorkbenchView: (view: 'list' | 'analysis' | 'notes') => void
}

function SchoolAnalysisView({
  selectedSchool, activeYear, schoolAtlasEntry = null, isSchoolAtlasLoading = false, schoolAtlasError = null,
  scopeLabel, scopeAverage, scopeMedian, countyAverage,
  selectedSchoolRank, sortedSchoolsCount, sortedSchoolsMax, cohortRank, cohortCount, peerSchools,
  selectedTownshipSummary, highlightedSchoolId = null,
  onHoverSchool, onSelectSchool, onSetWorkbenchView,
}: SchoolAnalysisViewProps) {
  const [activeChartTab, setActiveChartTab] = useState<'overview' | 'trend' | 'ranking' | 'positioning'>('overview')
  const [activeBenchmarkView, setActiveBenchmarkView] = useState<'township' | 'county' | 'peers'>('township')
  const [trendMetric, setTrendMetric] = useState<'students' | 'delta' | 'ratio'>('students')

  const trendPoints = useMemo(
    () => buildTrendMetricSeries(selectedSchool.trend, trendMetric),
    [selectedSchool.trend, trendMetric],
  )

  const benchmarkTrendPoints = useMemo(() => {
    const comparisonSchools = peerSchools.filter((school) => school.id !== selectedSchool.id)
    const sourceSchools = comparisonSchools.length > 0 ? comparisonSchools : peerSchools

    if (sourceSchools.length === 0) {
      return trendPoints
    }

    return selectedSchool.trend.map((point) => {
      const yearValues = sourceSchools
        .map((school) => buildTrendMetricSeries(school.trend, trendMetric).find((trendPoint) => trendPoint.year === point.year)?.value)
        .filter((value): value is number => Number.isFinite(value))

      const averageValue = yearValues.length > 0
        ? yearValues.reduce((sum, value) => sum + value, 0) / yearValues.length
        : trendPoints.find((trendPoint) => trendPoint.year === point.year)?.value ?? point.value

      return {
        year: point.year,
        value: Number(averageValue.toFixed(trendMetric === 'ratio' ? 2 : 0)),
      }
    })
  }, [peerSchools, selectedSchool.id, selectedSchool.trend, trendMetric, trendPoints])

  const benchmarkItems = useMemo(() => {
    if (activeBenchmarkView === 'peers') {
      return peerSchools.map((school) => ({ id: school.id, label: school.name, value: school.currentStudents }))
    }
    return [
      { id: selectedSchool.id, label: selectedSchool.name, value: selectedSchool.currentStudents },
      {
        id: activeBenchmarkView === 'county' ? 'county-average' : 'scope-average',
        label: activeBenchmarkView === 'county' ? '縣市平均' : (selectedTownshipSummary ? '鄉鎮平均' : '目前範圍平均'),
        value: activeBenchmarkView === 'county' ? countyAverage : scopeAverage,
      },
    ]
  }, [activeBenchmarkView, countyAverage, peerSchools, scopeAverage, selectedSchool, selectedTownshipSummary])

  const peerRankingItems = useMemo(
    () => [...peerSchools]
      .sort((left, right) => right.currentStudents - left.currentStudents)
      .slice(0, 8)
      .map((school) => ({ id: school.id, label: school.name, value: school.currentStudents })),
    [peerSchools],
  )

  const schoolFactCards = [
    { label: '目前學生數', value: `${formatStudents(selectedSchool.currentStudents)} 人`, meta: formatAcademicYear(activeYear) },
    { label: '今年增減', value: `${formatDelta(selectedSchool.delta)} 人`, meta: formatPercent(selectedSchool.deltaRatio) },
    { label: '範圍排名', value: `#${selectedSchoolRank}`, meta: `${scopeLabel} 共 ${sortedSchoolsCount} 所` },
    { label: '資料狀態', value: selectedSchool.status ?? '正常', meta: selectedSchool.missingYears?.length ? `缺 ${selectedSchool.missingYears.join('、')}` : '正式資料完整' },
  ]

  const schoolProfileFacts = useMemo(() => [
    { label: '學校代碼', value: selectedSchool.code },
    { label: '所屬範圍', value: `${selectedSchool.countyName} / ${selectedSchool.townshipName}` },
    { label: '學制 / 類型', value: `${selectedSchool.educationLevel} / ${selectedSchool.managementType}` },
    { label: '地址', value: selectedSchool.address || '未提供' },
    { label: '電話', value: selectedSchool.phone || '未提供' },
    { label: '網站', value: selectedSchool.website || '未提供' },
  ], [selectedSchool.address, selectedSchool.code, selectedSchool.countyName, selectedSchool.educationLevel, selectedSchool.managementType, selectedSchool.phone, selectedSchool.townshipName, selectedSchool.website])

  return (
    <div className="school-analysis-panel" data-testid="school-focus-panel">
      <nav className="school-analysis-panel__chart-path" aria-label="目前導覽路徑">
        <span>全台總覽</span>
        <span className="school-analysis-panel__chart-path-sep" aria-hidden="true">→</span>
        <span className="school-analysis-panel__chart-path-segment">{selectedSchool.countyName} 縣市分析</span>
        <span className="school-analysis-panel__chart-path-sep" aria-hidden="true">→</span>
        <span className="school-analysis-panel__chart-path-segment">{selectedSchool.townshipName} 各校分析</span>
        <span className="school-analysis-panel__chart-path-sep" aria-hidden="true">→</span>
        <span className="school-analysis-panel__chart-path-segment school-analysis-panel__chart-path-segment--current">{selectedSchool.name}</span>
      </nav>
      <section className="dashboard-card school-analysis-panel__hero school-focus--overview">
        <div className="dashboard-card__head">
          <div className="panel-heading__stack">
            <h3 className="dashboard-card__title">{selectedSchool.name}</h3>
            <p className="dashboard-card__subtitle">
              {selectedSchool.countyName} / {selectedSchool.townshipName} / {selectedSchool.educationLevel} / {selectedSchool.managementType}
            </p>
          </div>
          <div className="dashboard-card__actions">
            <div className="school-focus__statline">
              <strong>{formatStudents(selectedSchool.currentStudents)} 人</strong>
              <span>
                今年增減 {formatDelta(selectedSchool.delta)} 人 / {formatPercent(selectedSchool.deltaRatio)}
              </span>
            </div>
          </div>
        </div>

        <div className="dashboard-card__body">
          <div className="school-focus__meta-grid">
            {schoolFactCards.map((card) => (
              <article key={card.label} className="school-focus__meta-card">
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <small>{card.meta}</small>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="school-analysis-panel__grid">
        <section className="dashboard-card school-chart-panel">
          <div className="dashboard-card__head">
            <div className="panel-heading__stack">
              <h3 className="dashboard-card__title">校別深度數據分析</h3>
              <p className="dashboard-card__subtitle">多維度趨勢與定位掃描</p>
            </div>
            <div className="dashboard-card__actions">
              <div className="school-chart-tabs" role="tablist" aria-label="單校圖表分頁">
                <button type="button" role="tab" aria-selected={activeChartTab === 'overview'} className={activeChartTab === 'overview' ? 'chip chip--active' : 'chip'} onClick={() => setActiveChartTab('overview')}>概況</button>
                <button type="button" role="tab" aria-selected={activeChartTab === 'trend'} className={activeChartTab === 'trend' ? 'chip chip--active' : 'chip'} onClick={() => setActiveChartTab('trend')}>趨勢</button>
                <button type="button" role="tab" aria-selected={activeChartTab === 'ranking'} className={activeChartTab === 'ranking' ? 'chip chip--active' : 'chip'} onClick={() => setActiveChartTab('ranking')}>排行</button>
                <button type="button" role="tab" aria-selected={activeChartTab === 'positioning'} className={activeChartTab === 'positioning' ? 'chip chip--active' : 'chip'} onClick={() => setActiveChartTab('positioning')}>定位</button>
              </div>
            </div>
          </div>

          <div className="dashboard-card__body">

          {activeChartTab === 'overview' ? (
            <SchoolAnalysisOverviewSection
              selectedSchool={selectedSchool}
              activeYear={activeYear}
              selectedSchoolRank={selectedSchoolRank}
              scopeLabel={scopeLabel}
              schoolAtlasEntry={schoolAtlasEntry}
              isSchoolAtlasLoading={isSchoolAtlasLoading}
              schoolAtlasError={schoolAtlasError}
              peerRankingItems={peerRankingItems}
              highlightedSchoolId={highlightedSchoolId}
              onHoverSchool={onHoverSchool}
              onSelectSchool={onSelectSchool}
              schoolProfileFacts={schoolProfileFacts}
            />
          ) : null}

          {activeChartTab === 'trend' ? (
            <SchoolAnalysisTrendSection selectedSchool={selectedSchool} activeYear={activeYear} trendMetric={trendMetric} onSetTrendMetric={setTrendMetric} trendPoints={trendPoints} benchmarkPoints={benchmarkTrendPoints} />
          ) : null}

          {activeChartTab === 'ranking' ? (
            <SchoolAnalysisRankingSection selectedSchool={selectedSchool} selectedTownshipSummary={selectedTownshipSummary} activeBenchmarkView={activeBenchmarkView} onSetActiveBenchmarkView={setActiveBenchmarkView} benchmarkItems={benchmarkItems} highlightedSchoolId={highlightedSchoolId} onHoverSchool={onHoverSchool} onSelectSchool={onSelectSchool} />
          ) : null}

          {activeChartTab === 'positioning' ? (
            <SchoolAnalysisPositioningSection selectedSchool={selectedSchool} scopeLabel={scopeLabel} cohortRank={cohortRank} cohortCount={cohortCount} scopeAverage={scopeAverage} scopeMedian={scopeMedian} sortedSchoolsMax={sortedSchoolsMax} />
          ) : null}
        </div>
      </section>

        <div className="school-analysis-panel__side">
          <div className="school-profile-sidebar__info">
            <div className="school-profile-info-row">
              <span>{selectedTownshipSummary ? '鄉鎮平均' : '目前範圍平均'}</span>
              <strong>{formatStudents(scopeAverage)} 人</strong>
            </div>
            <div className="school-profile-info-row">
              <span>縣市平均</span>
              <strong>{formatStudents(countyAverage)} 人</strong>
            </div>
            <div className="school-profile-info-row">
              <span>範圍中位數</span>
              <strong>{formatStudents(scopeMedian)} 人</strong>
            </div>
          </div>

          {selectedSchool.dataNotes && selectedSchool.dataNotes.length > 0 ? (
            <div className="school-analysis-panel__note-preview note-stack">
              {selectedSchool.dataNotes.slice(0, 2).map((note) => (
                <article key={`${selectedSchool.id}-${note.type}-${note.message}`} className={`data-note data-note--${note.severity}`} data-testid="data-note">
                  <strong>{note.type}</strong>
                  <span>{note.message}</span>
                </article>
              ))}
            </div>
          ) : null}

          <div className="school-profile-sidebar__actions">
            {selectedSchool.website ? (
              <a className="ghost-button school-profile-link" href={selectedSchool.website} target="_blank" rel="noreferrer">
                查看學校資訊
              </a>
            ) : null}
            <button type="button" className="ghost-button" onClick={() => onSetWorkbenchView('notes')}>
              查看完整註記
            </button>
            <button type="button" className="ghost-button" onClick={() => onSelectSchool(null)}>
              清除單校聚焦
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SchoolAnalysisView
