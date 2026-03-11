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
      <div className="school-detail-shell__topbar">
        <div>
          <p className="eyebrow eyebrow--cyan">區域陣列掃描</p>
          <h3>{schoolPanelTitle ?? '學校清單與規模分布'}</h3>
          <p>{selectedSchool ? `目前已捕捉 ${selectedSchool.name}。此頁維持宏觀的清單矩陣，查看該校特寫請前往「校別概況」。` : `${scopeLabel} 群像。支援散點、箱線圖及清單交叉檢視，點擊節點即可查看校別概況。`}</p>
        </div>

        <div className="school-detail-shell__topbar-actions">
          {selectedSchool ? (
            <button type="button" className="ghost-button" onClick={() => onSetWorkbenchView('analysis')}>
              前往校別概況
            </button>
          ) : null}
        </div>
      </div>

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
          <section className="school-list-workspace__card">
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
            />
          </section>

          <section className="school-list-workspace__card school-list-workspace__card--distribution">
            {schoolInsights.length > 0 ? (
              <div className="school-distribution-stack">
                <HistogramChart title={`${scopeLabel} 學校規模分布`} subtitle="以真正的直方圖揭露規模集中區間，再用盒鬚圖補充各學制群體差異。" values={schoolInsights.map((school) => school.currentStudents)} activeValue={selectedSchool?.currentStudents ?? null} />
                {sizeDistributionGroups.length > 0 ? (
                  <BoxPlotChart title={`${scopeLabel} 學制箱形摘要`} subtitle="以盒鬚圖補充不同學制的中位數、四分位距與離散程度。" groups={sizeDistributionGroups} />
                ) : null}
              </div>
            ) : scopeDistribution.length > 0 ? (
              <PieChart slices={scopeDistribution} size={124} />
            ) : (
              <div className="empty-state">目前條件沒有可顯示的學校分布。</div>
            )}
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
      <div className="school-detail-shell__topbar school-detail-shell__topbar--focus">
        <div>
          <p className="eyebrow">校別概況</p>
          <h3>{selectedSchool?.name ?? schoolPanelTitle ?? '單校分析'}</h3>
          <p>{selectedSchool ? '此頁只保留單校內容，與各校分析的列表工作台分開。' : '請先從各校分析選擇一所學校。'}</p>
        </div>

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
