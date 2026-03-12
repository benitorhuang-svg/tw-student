import BoxPlotChart from './BoxPlotChart'
import HistogramChart from './HistogramChart'
import PieChart from './PieChart'
import ScatterPlotChart from './ScatterPlotChart'
import SchoolAnalysisView from './SchoolAnalysisView'
import SchoolDataTable from './SchoolDataTable'
import SchoolNotesView from './SchoolNotesView'
import type { CountySchoolAtlasDataset } from '../data/educationData'
import type { SchoolInsight } from '../lib/analytics'
import { formatAcademicYear, formatStudents } from '../lib/analytics'
import type { AcademicYear } from '../hooks/types'
import type { SchoolWorkbenchView } from './schoolDetail.types'

export function SchoolDetailWorkspace(props: {
  scopeLabel: string
  activeYear: AcademicYear
  schoolPanelTitle?: string
  selectedSchool: SchoolInsight | null
  schoolInsights: SchoolInsight[]
  sortedSchools: SchoolInsight[]
  scopeAverage: number
  scopeMedian: number
  sizeDistributionGroups: Array<{ id: string; label: string; values: number[] }>
  scopeDistribution: Array<{ label: string; value: number; share: number }>
  onSetWorkbenchView: (view: SchoolWorkbenchView) => void
  onHoverSchool?: (schoolId: string | null) => void
  onSelectSchool: (schoolId: string | null) => void
}) {
  const { scopeLabel, activeYear, schoolPanelTitle, selectedSchool, schoolInsights, sortedSchools, scopeAverage, scopeMedian, sizeDistributionGroups, scopeDistribution, onSetWorkbenchView, onHoverSchool, onSelectSchool } = props
  return (
    <>
    <section className="dashboard-card school-detail-shell__topbar" style={{ marginBottom: '14px' }}>
      <div className="dashboard-card__head">
        <div className="panel-heading__stack">
          <h3 className="dashboard-card__title">{schoolPanelTitle ?? '學校清單與規模分布'}</h3>
          <p className="dashboard-card__subtitle">{selectedSchool ? `目前已捕捉 ${selectedSchool.name}` : `${scopeLabel} 群像`}</p>
        </div>

        <div className="dashboard-card__actions">
          {selectedSchool ? (
            <button type="button" className="ghost-button" onClick={() => onSetWorkbenchView('analysis')}>
              前往校別概況
            </button>
          ) : null}
        </div>
      </div>
    </section>

      <div className="school-list-workspace">
        <div className="school-list-workspace__summary">
          <article className="school-list-workspace__summary-card">
            <span>目前範圍</span>
            <strong>{scopeLabel}</strong>
            <small>{formatAcademicYear(activeYear)}</small>
          </article>
          <article className="school-list-workspace__summary-card">
            <span>學校總數</span>
            <strong>{formatStudents(schoolInsights.length)} 校</strong>
            <small>符合目前篩選條件</small>
          </article>
          <article className="school-list-workspace__summary-card">
            <span>平均每校</span>
            <strong>{formatStudents(scopeAverage)} 人</strong>
            <small>中位數 {formatStudents(scopeMedian)} 人</small>
          </article>
          <article className="school-list-workspace__summary-card">
            <span>目前聚焦</span>
            <strong>{selectedSchool?.name ?? '尚未選校'}</strong>
            <small>{selectedSchool ? `${formatStudents(selectedSchool.currentStudents)} 人` : '可從圖表或表格選擇學校'}</small>
          </article>
        </div>

        <div className="school-list-workspace__grid">
          <ScatterPlotChart
            title={`${scopeLabel} 各校規模散點圖`}
            subtitle="X 軸看學生數，Y 軸看年變動率，協助先找出規模與趨勢的離群校。"
            xLabel="學生數"
            yLabel="年變動率 (%)"
            points={sortedSchools.map((school) => ({
              id: school.id,
              label: school.name,
              x: school.currentStudents,
              y: school.deltaRatio * 100,
              size: Math.max(Math.abs(school.delta), 12),
            }))}
            activePointId={selectedSchool?.id ?? null}
            formatY={(value) => `${value.toFixed(1)}%`}
            onHoverPoint={onHoverSchool}
            onSelectPoint={onSelectSchool}
            flat={true}
            className="school-list-workspace__card--scatter"
          />

          <section className="dashboard-card dashboard-card--flat school-list-workspace__card--distribution" data-testid="schools-distribution-card">
            <div className="dashboard-card__body" style={{ padding: '0' }}>
              {schoolInsights.length > 0 ? (
                <div className="school-distribution-stack school-distribution-stack--workspace" data-testid="schools-distribution-stack">
                  <HistogramChart
                    title={`${scopeLabel} 學校規模分布`}
                    subtitle="揭露規模集中區間"
                    values={schoolInsights.map((school) => school.currentStudents)}
                    activeValue={selectedSchool?.currentStudents ?? null}
                    flat={true}
                  />
                  {sizeDistributionGroups.length > 0 ? (
                    <BoxPlotChart
                      title={`${scopeLabel} 學制箱形摘要`}
                      subtitle="學制的中位數與離散程度"
                      groups={sizeDistributionGroups}
                      flat={true}
                    />
                  ) : null}
                </div>
              ) : scopeDistribution.length > 0 ? (
                <div data-testid="schools-fallback-pie" style={{ padding: '20px' }}>
                  <PieChart slices={scopeDistribution} size={124} />
                </div>
              ) : (
                <div className="chart-empty-state">目前條件沒有可顯示的學校分布。</div>
              )}
            </div>
          </section>
        </div>

        <SchoolDataTable schools={schoolInsights} selectedSchoolId={selectedSchool?.id ?? null} onSelectSchool={onSelectSchool} onHoverSchool={onHoverSchool} scopeLabel={scopeLabel} />
      </div>
    </>
  )
}

export function SchoolDetailFocus(props: {
  selectedSchool: SchoolInsight | null
  schoolPanelTitle?: string
  effectiveFocusView: 'analysis' | 'notes'
  activeYear: AcademicYear
  scopeLabel: string
  scopeAverage: number
  scopeMedian: number
  countyAverage: number
  selectedSchoolRank: number
  sortedSchoolsCount: number
  sortedSchoolsMax: number
  cohortRank: number
  cohortCount: number
  peerSchools: SchoolInsight[]
  selectedTownshipSummary: { label: string } | null
  highlightedSchoolId?: string | null
  selectedSchoolAtlasEntry: CountySchoolAtlasDataset['schools'][number] | null
  isCountySchoolAtlasLoading: boolean
  countySchoolAtlasError: string | null
  onSetWorkbenchView: (view: SchoolWorkbenchView) => void
  onHoverSchool?: (schoolId: string | null) => void
  onSelectSchool: (schoolId: string | null) => void
}) {
  const { selectedSchool, schoolPanelTitle, effectiveFocusView, activeYear, scopeLabel, scopeAverage, scopeMedian, countyAverage, selectedSchoolRank, sortedSchoolsCount, sortedSchoolsMax, cohortRank, cohortCount, peerSchools, selectedTownshipSummary, highlightedSchoolId = null, selectedSchoolAtlasEntry, isCountySchoolAtlasLoading, countySchoolAtlasError, onSetWorkbenchView, onHoverSchool, onSelectSchool } = props
  return (
    <>
    <section className="dashboard-card school-detail-shell__topbar school-detail-shell__topbar--focus" style={{ marginBottom: '14px' }}>
      <div className="dashboard-card__head">
        <div className="panel-heading__stack">
          <h3 className="dashboard-card__title">{selectedSchool?.name ?? schoolPanelTitle ?? '單校分析'}</h3>
          <p className="dashboard-card__subtitle">校別概況與資料註記</p>
        </div>

        <div className="dashboard-card__actions">
          <div className="school-workbench-tabs school-workbench-tabs--focus" role="tablist" aria-label="校別概況分頁">
            <button type="button" role="tab" aria-selected={false} className="chip" onClick={() => onSetWorkbenchView('list')}>
              回到各校分析
            </button>
            <button type="button" role="tab" aria-selected={effectiveFocusView === 'analysis'} className={effectiveFocusView === 'analysis' ? 'chip chip--active' : 'chip'} onClick={() => onSetWorkbenchView('analysis')} disabled={!selectedSchool}>
              校別概況
            </button>
            <button type="button" role="tab" aria-selected={effectiveFocusView === 'notes'} className={effectiveFocusView === 'notes' ? 'chip chip--active' : 'chip'} onClick={() => onSetWorkbenchView('notes')} disabled={!selectedSchool}>
              資料註記
            </button>
          </div>
        </div>
      </div>
    </section>

      {effectiveFocusView === 'analysis' ? (
        selectedSchool ? (
          <SchoolAnalysisView
            selectedSchool={selectedSchool}
            schoolAtlasEntry={selectedSchoolAtlasEntry ?? null}
            isSchoolAtlasLoading={isCountySchoolAtlasLoading}
            schoolAtlasError={countySchoolAtlasError}
            activeYear={activeYear}
            scopeLabel={scopeLabel}
            scopeAverage={scopeAverage}
            scopeMedian={scopeMedian}
            countyAverage={countyAverage}
            selectedSchoolRank={selectedSchoolRank}
            sortedSchoolsCount={sortedSchoolsCount}
            sortedSchoolsMax={sortedSchoolsMax}
            cohortRank={cohortRank}
            cohortCount={cohortCount}
            peerSchools={peerSchools}
            selectedTownshipSummary={selectedTownshipSummary}
            highlightedSchoolId={highlightedSchoolId}
            onHoverSchool={onHoverSchool}
            onSelectSchool={onSelectSchool}
            onSetWorkbenchView={onSetWorkbenchView}
          />
        ) : (
          <div className="empty-state">請先點選地圖學校或表格列，右側才會切到單校分析。</div>
        )
      ) : null}

      {effectiveFocusView === 'notes' ? (
        selectedSchool ? (
          <SchoolNotesView selectedSchool={selectedSchool} />
        ) : (
          <div className="empty-state">請先選擇一所學校，再查看資料註記。</div>
        )
      ) : null}
    </>
  )
}
