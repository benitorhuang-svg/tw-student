import { useMemo } from 'react'

import BoxPlotChart from './BoxPlotChart'
import ScatterPlotChart from './ScatterPlotChart'
import PieChart from './PieChart'
import SchoolAnalysisView from './SchoolAnalysisView'
import SchoolDataTable from './SchoolDataTable'
import SchoolNotesView from './SchoolNotesView'
import type { CountySchoolAtlasDataset } from '../data/educationData'
import type { SchoolInsight } from '../lib/analytics'
import { formatAcademicYear, formatStudents } from '../lib/analytics'
import type { AcademicYear } from '../hooks/types'

type ScopeSummaryLabel = {
  label: string
} | null

type SchoolDetailPanelProps = {
  selectedCountyName: string | null
  countyDetailError: string | null
  isCountyDetailLoading: boolean
  schoolInsights: SchoolInsight[]
  countyWideSchoolInsights: SchoolInsight[]
  selectedSchool: SchoolInsight | null
  selectedCountySchoolAtlas?: CountySchoolAtlasDataset | null
  isCountySchoolAtlasLoading?: boolean
  countySchoolAtlasError?: string | null
  schoolPanelTitle?: string
  panelMode: 'workspace' | 'focus'
  activeYear: AcademicYear
  activeWorkbenchView: SchoolWorkbenchView
  selectedTownshipSummary: ScopeSummaryLabel
  selectedCountySummary: ScopeSummaryLabel
  highlightedSchoolId?: string | null
  onSetWorkbenchView: (view: SchoolWorkbenchView) => void
  onHoverSchool?: (schoolId: string | null) => void
  onSelectSchool: (schoolId: string | null) => void
}

type SchoolWorkbenchView = 'list' | 'analysis' | 'notes'

function SchoolDetailPanel({
  selectedCountyName,
  countyDetailError,
  isCountyDetailLoading,
  schoolInsights,
  countyWideSchoolInsights,
  selectedSchool,
  selectedCountySchoolAtlas = null,
  isCountySchoolAtlasLoading = false,
  countySchoolAtlasError = null,
  schoolPanelTitle,
  panelMode,
  activeYear,
  activeWorkbenchView,
  selectedTownshipSummary,
  selectedCountySummary,
  highlightedSchoolId = null,
  onSetWorkbenchView,
  onHoverSchool,
  onSelectSchool,
}: SchoolDetailPanelProps) {
  const sortedSchools = useMemo(
    () => [...schoolInsights].sort((left, right) => right.currentStudents - left.currentStudents),
    [schoolInsights],
  )
  const selectedSchoolRank = selectedSchool ? sortedSchools.findIndex((school) => school.id === selectedSchool.id) + 1 : 0
  const scopeAverage = sortedSchools.length > 0
    ? Math.round(sortedSchools.reduce((sum, school) => sum + school.currentStudents, 0) / sortedSchools.length)
    : 0
  const scopeMedian = sortedSchools.length > 0
    ? sortedSchools[Math.floor((sortedSchools.length - 1) / 2)]?.currentStudents ?? 0
    : 0
  const scopeLabel = selectedTownshipSummary?.label ?? selectedCountySummary?.label ?? selectedCountyName ?? '目前範圍'
  const effectiveFocusView = selectedSchool && activeWorkbenchView === 'notes' ? 'notes' : 'analysis'
  const countyAverage = countyWideSchoolInsights.length > 0
    ? Math.round(countyWideSchoolInsights.reduce((sum, school) => sum + school.currentStudents, 0) / countyWideSchoolInsights.length)
    : scopeAverage
  const peerSchools = selectedSchool
    ? countyWideSchoolInsights
      .filter((school) => school.educationLevel === selectedSchool.educationLevel)
      .slice(0, 10)
    : []
  const scopeDistribution = useMemo(() => {
    const totals = new Map<string, number>()
    schoolInsights.forEach((school) => {
      totals.set(school.educationLevel, (totals.get(school.educationLevel) ?? 0) + school.currentStudents)
    })

    const totalStudents = [...totals.values()].reduce((sum, value) => sum + value, 0)
    return [...totals.entries()]
      .map(([label, value]) => ({ label, value, share: totalStudents === 0 ? 0 : value / totalStudents }))
      .sort((left, right) => right.value - left.value)
  }, [schoolInsights])
  const sizeDistributionGroups = useMemo(() => {
    const groups = new Map<string, number[]>()
    schoolInsights.forEach((school) => {
      groups.set(school.educationLevel, [...(groups.get(school.educationLevel) ?? []), school.currentStudents])
    })
    return [...groups.entries()].map(([label, values]) => ({ id: label, label, values }))
  }, [schoolInsights])
  const selectedSchoolAtlasEntry = useMemo(() => {
    if (!selectedSchool) return null

    const atlasEntry = selectedCountySchoolAtlas?.schools.find((entry) => entry.code === selectedSchool.code)
    if (atlasEntry) return atlasEntry

    if ((selectedSchool.studentCompositions?.length ?? 0) === 0) return null

    return {
      code: selectedSchool.code,
      primaryName: selectedSchool.name,
      aliases: [],
      levels: [{
        schoolId: selectedSchool.id,
        name: selectedSchool.name,
        educationLevel: selectedSchool.educationLevel,
        managementType: selectedSchool.managementType,
        countyId: '',
        countyName: selectedSchool.countyName,
        townshipId: selectedSchool.townshipId,
        townshipName: selectedSchool.townshipName,
        coordinates: { longitude: 0, latitude: 0 },
        address: selectedSchool.address,
        phone: selectedSchool.phone,
        website: selectedSchool.website,
        yearlyStudents: selectedSchool.trend.map((point) => ({ year: point.year, students: point.value })),
        studentCompositions: selectedSchool.studentCompositions ?? [],
        status: selectedSchool.status,
        missingYears: selectedSchool.missingYears,
        dataNotes: selectedSchool.dataNotes,
      }],
    }
  }, [selectedCountySchoolAtlas, selectedSchool])

  return (
    <section className="panel school-detail-panel" data-testid="school-detail-panel">
      {!selectedCountyName ? (
        <div className="empty-state">請先從地圖或排行選擇縣市，系統才會載入該縣市的學校明細。</div>
      ) : countyDetailError ? (
        <div className="empty-state">{countyDetailError}</div>
      ) : isCountyDetailLoading ? (
        <div className="empty-state" data-testid="county-detail-loading">正在載入 {selectedCountyName} 的學校細節資料...</div>
      ) : schoolInsights.length === 0 ? (
        <div className="empty-state">目前篩選條件沒有對應學校，請放寬條件或切換分析層級。</div>
      ) : (
        <div className="school-detail-shell">
          {panelMode === 'workspace' ? (
            <div className="school-detail-shell__topbar">
              <div>
                <p className="eyebrow" style={{ color: 'var(--palette-cyan)' }}>區域陣列掃描</p>
                <h3>{schoolPanelTitle ?? '學校清單與規模分布'}</h3>
                <p>{selectedSchool ? `目前已捕捉 ${selectedSchool.name}。此頁維持宏觀的清單矩陣，查看該校特寫請前往「校別概況」。` : `${scopeLabel} 群像。支援散點、箱線圖及清單交叉檢視，點擊節點即可查看校別概況。`}</p>
              </div>

              <div className="school-detail-shell__topbar-actions">
                {selectedSchool ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => onSetWorkbenchView('analysis')}
                  >
                    前往校別概況
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="school-detail-shell__topbar school-detail-shell__topbar--focus">
              <div>
                <p className="eyebrow">校別概況</p>
                <h3>{selectedSchool?.name ?? schoolPanelTitle ?? '單校分析'}</h3>
                <p>{selectedSchool ? `此頁只保留單校內容，與各校分析的列表工作台分開。` : '請先從各校分析選擇一所學校。'}</p>
              </div>

              <div className="school-workbench-tabs school-workbench-tabs--focus" role="tablist" aria-label="校別概況分頁">
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="chip"
                  onClick={() => onSetWorkbenchView('list')}
                >
                  回到各校分析
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={effectiveFocusView === 'analysis'}
                  className={effectiveFocusView === 'analysis' ? 'chip chip--active' : 'chip'}
                  onClick={() => onSetWorkbenchView('analysis')}
                  disabled={!selectedSchool}
                >
                  校別概況
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={effectiveFocusView === 'notes'}
                  className={effectiveFocusView === 'notes' ? 'chip chip--active' : 'chip'}
                  onClick={() => onSetWorkbenchView('notes')}
                  disabled={!selectedSchool}
                >
                  資料註記
                </button>
              </div>
            </div>
          )}

          {panelMode === 'workspace' ? (
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
                  {sizeDistributionGroups.length > 0 ? (
                    <BoxPlotChart
                      title={`${scopeLabel} 學校規模箱形圖`}
                      subtitle="依學制比較各校學生數分布，補足散點圖看不出的群體差異。"
                      groups={sizeDistributionGroups}
                    />
                  ) : scopeDistribution.length > 0 ? (
                    <PieChart slices={scopeDistribution} size={124} />
                  ) : (
                    <div className="empty-state">目前條件沒有可顯示的學校分布。</div>
                  )}
                </section>
              </div>

              <SchoolDataTable
                schools={schoolInsights}
                selectedSchoolId={selectedSchool?.id ?? null}
                onSelectSchool={onSelectSchool}
                onHoverSchool={onHoverSchool}
                scopeLabel={scopeLabel}
              />
            </div>
          ) : null}

          {panelMode === 'focus' && effectiveFocusView === 'analysis' ? (
            selectedSchool ? (
              <SchoolAnalysisView
                selectedSchool={selectedSchool}
                schoolAtlasEntry={selectedSchoolAtlasEntry}
                isSchoolAtlasLoading={isCountySchoolAtlasLoading}
                schoolAtlasError={countySchoolAtlasError}
                activeYear={activeYear}
                scopeLabel={scopeLabel}
                scopeAverage={scopeAverage}
                scopeMedian={scopeMedian}
                countyAverage={countyAverage}
                selectedSchoolRank={selectedSchoolRank}
                sortedSchoolsCount={sortedSchools.length}
                sortedSchoolsMax={sortedSchools[0]?.currentStudents ?? 0}
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

          {panelMode === 'focus' && effectiveFocusView === 'notes' ? (
            selectedSchool ? (
              <SchoolNotesView selectedSchool={selectedSchool} />
            ) : (
              <div className="empty-state">請先選擇一所學校，再查看資料註記。</div>
            )
          ) : null}
        </div>
      )}
    </section>
  )
}

export default SchoolDetailPanel
