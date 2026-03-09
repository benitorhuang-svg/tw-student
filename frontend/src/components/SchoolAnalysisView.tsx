import ComparisonBarChart from './ComparisonBarChart'
import SchoolOverviewChart from './SchoolOverviewChart'
import TrendChart from './TrendChart'
import { useMemo, useState } from 'react'
import { formatAcademicYear, formatDelta, formatPercent, formatStudents, type SchoolInsight } from '../lib/analytics'
import type { AcademicYear } from '../hooks/types'

type SchoolAnalysisViewProps = {
  selectedSchool: SchoolInsight; activeYear: AcademicYear
  scopeLabel: string; scopeAverage: number; scopeMedian: number; countyAverage: number
  selectedSchoolRank: number; sortedSchoolsCount: number; sortedSchoolsMax: number
  peerSchools: SchoolInsight[]
  selectedTownshipSummary: { label: string } | null
  highlightedSchoolId?: string | null
  onHoverSchool?: (schoolId: string | null) => void
  onSelectSchool: (schoolId: string | null) => void
  onSetWorkbenchView: (view: 'list' | 'analysis' | 'notes') => void
}

function SchoolAnalysisView({
  selectedSchool, activeYear, scopeLabel, scopeAverage, scopeMedian, countyAverage,
  selectedSchoolRank, sortedSchoolsCount, sortedSchoolsMax, peerSchools,
  selectedTownshipSummary, highlightedSchoolId = null,
  onHoverSchool, onSelectSchool, onSetWorkbenchView,
}: SchoolAnalysisViewProps) {
  const [activeChartTab, setActiveChartTab] = useState<'overview' | 'trend' | 'ranking' | 'positioning'>('overview')
  const [activeBenchmarkView, setActiveBenchmarkView] = useState<'township' | 'county' | 'peers'>('township')
  const [trendMetric, setTrendMetric] = useState<'students' | 'delta' | 'ratio'>('students')

  const trendPoints = useMemo(
    () =>
      selectedSchool.trend.map((point, index, trend) => {
        if (trendMetric === 'students') return point
        const previousPoint = trend[index - 1]
        const delta = previousPoint ? point.value - previousPoint.value : 0
        if (trendMetric === 'delta') return { year: point.year, value: delta }
        const ratio = previousPoint && previousPoint.value > 0 ? delta / previousPoint.value : 0
        return { year: point.year, value: Number((ratio * 100).toFixed(2)) }
      }),
    [selectedSchool.trend, trendMetric],
  )

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

  const schoolProfileFacts = [
    { label: '學校代碼', value: selectedSchool.code },
    { label: '所屬範圍', value: `${selectedSchool.countyName} / ${selectedSchool.townshipName}` },
    { label: '學制 / 類型', value: `${selectedSchool.educationLevel} / ${selectedSchool.managementType}` },
    { label: '地址', value: selectedSchool.address || '未提供' },
    { label: '電話', value: selectedSchool.phone || '未提供' },
    { label: '網站', value: selectedSchool.website || '未提供' },
  ]

  return (
    <div className="school-analysis-panel" data-testid="school-focus-panel">
      <div className="school-analysis-panel__chart-path">
        全台總覽 → {selectedSchool.countyName}縣市分析 → {selectedSchool.townshipName}各校分析 → {selectedSchool.name}校別概況
      </div>
      <section className="school-focus school-analysis-panel__hero school-focus--overview">
        <div className="school-focus__summary">
          <div>
            <p className="eyebrow">學校分析</p>
            <h3>{selectedSchool.name}</h3>
            <p>
              {selectedSchool.countyName} / {selectedSchool.townshipName} / {selectedSchool.educationLevel} / {selectedSchool.managementType}
            </p>
          </div>
          <div className="school-focus__statline">
            <strong>{formatStudents(selectedSchool.currentStudents)} 人</strong>
            <span>
              今年增減 {formatDelta(selectedSchool.delta)} 人 / {formatPercent(selectedSchool.deltaRatio)}
            </span>
          </div>
        </div>
        <div className="school-focus__meta-grid">
          {schoolFactCards.map((card) => (
            <article key={card.label} className="school-focus__meta-card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.meta}</small>
            </article>
          ))}
        </div>
      </section>

      <div className="school-analysis-panel__grid">
        <div className="school-chart-panel">
          <div className="school-chart-tabs" role="tablist" aria-label="單校圖表分頁">
            <button type="button" role="tab" aria-selected={activeChartTab === 'overview'} className={activeChartTab === 'overview' ? 'chip chip--active' : 'chip'} onClick={() => setActiveChartTab('overview')}>校別概況</button>
            <button type="button" role="tab" aria-selected={activeChartTab === 'trend'} className={activeChartTab === 'trend' ? 'chip chip--active' : 'chip'} onClick={() => setActiveChartTab('trend')}>校別趨勢</button>
            <button type="button" role="tab" aria-selected={activeChartTab === 'ranking'} className={activeChartTab === 'ranking' ? 'chip chip--active' : 'chip'} onClick={() => setActiveChartTab('ranking')}>同範圍排行</button>
            <button type="button" role="tab" aria-selected={activeChartTab === 'positioning'} className={activeChartTab === 'positioning' ? 'chip chip--active' : 'chip'} onClick={() => setActiveChartTab('positioning')}>規模定位</button>
          </div>

          {activeChartTab === 'overview' ? (
            <div className="school-chart-panel__section school-chart-panel__section--overview">
              <div className="school-moe-board">
                <div className="school-moe-board__header">
                  <div>
                    <p className="eyebrow">校別概況</p>
                    <h3>{selectedSchool.name} {activeYear} 學年度概況</h3>
                  </div>
                  <p className="panel-heading__meta">參考教育部校別概況的閱讀順序，先看歷年規模，再看同範圍比較與基本資料。</p>
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
          ) : null}

          {activeChartTab === 'trend' ? (
            <div className="school-chart-panel__section">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">趨勢切換</p>
                  <h3>{selectedSchool.name} 趨勢圖</h3>
                </div>
                <div className="chart-pill-row" role="tablist" aria-label="單校趨勢指標切換">
                  <button type="button" role="tab" aria-selected={trendMetric === 'students'} className={trendMetric === 'students' ? 'chip chip--active' : 'chip'} onClick={() => setTrendMetric('students')}>學生數</button>
                  <button type="button" role="tab" aria-selected={trendMetric === 'delta'} className={trendMetric === 'delta' ? 'chip chip--active' : 'chip'} onClick={() => setTrendMetric('delta')}>今年增減</button>
                  <button type="button" role="tab" aria-selected={trendMetric === 'ratio'} className={trendMetric === 'ratio' ? 'chip chip--active' : 'chip'} onClick={() => setTrendMetric('ratio')}>成長率</button>
                </div>
              </div>
              <TrendChart
                chartId="school-trend"
                title={`${selectedSchool.name}${trendMetric === 'students' ? ' 歷年學生數' : trendMetric === 'delta' ? ' 歷年今年增減' : ' 歷年成長率'}`}
                subtitle="同一張圖表容器支援學生數、今年增減與成長率三態切換。"
                points={trendPoints}
                activeYear={activeYear}
                formatValue={trendMetric === 'ratio' ? (value) => `${value.toFixed(1)}%` : (value) => `${formatDelta(Math.round(value))} 人`}
              />
            </div>
          ) : null}

          {activeChartTab === 'ranking' ? (
            <div className="school-chart-panel__section">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">基準切換</p>
                  <h3>{selectedSchool.name} 比較基準</h3>
                </div>
                <div className="chart-pill-row" role="tablist" aria-label="單校比較基準切換">
                  <button type="button" role="tab" aria-selected={activeBenchmarkView === 'township'} className={activeBenchmarkView === 'township' ? 'chip chip--active' : 'chip'} onClick={() => setActiveBenchmarkView('township')}>{selectedTownshipSummary ? '鄉鎮平均' : '目前範圍平均'}</button>
                  <button type="button" role="tab" aria-selected={activeBenchmarkView === 'county'} className={activeBenchmarkView === 'county' ? 'chip chip--active' : 'chip'} onClick={() => setActiveBenchmarkView('county')}>縣市平均</button>
                  <button type="button" role="tab" aria-selected={activeBenchmarkView === 'peers'} className={activeBenchmarkView === 'peers' ? 'chip chip--active' : 'chip'} onClick={() => setActiveBenchmarkView('peers')}>同學制前 10 校</button>
                </div>
              </div>
              <ComparisonBarChart
                items={benchmarkItems}
                activeItemId={highlightedSchoolId ?? selectedSchool.id}
                onHoverItem={activeBenchmarkView === 'peers' ? onHoverSchool : undefined}
                onSelectItem={activeBenchmarkView === 'peers' ? (schoolId) => onSelectSchool(schoolId) : undefined}
              />
            </div>
          ) : null}

          {activeChartTab === 'positioning' ? (
            <div className="school-chart-panel__section">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">規模定位</p>
                  <h3>{selectedSchool.name} 在 {scopeLabel} 的位置</h3>
                </div>
                <p className="panel-heading__meta">用單校、平均、中位數與最高值快速判讀目前規模。</p>
              </div>
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
          ) : null}
        </div>

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
