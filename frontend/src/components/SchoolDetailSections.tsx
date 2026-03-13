import ScatterPlotChart from './ScatterPlotChart'
import SchoolDataTable from './SchoolDataTable'
import SchoolNotesView from './SchoolNotesView'
import '../styles/templates/dashboard-shell/01-premium-cards-system.css'
import type { SchoolInsight } from '../lib/analytics'
import type { SchoolWorkbenchView } from './schoolDetail.types'

export function SchoolDetailWorkspace(props: {
  scopeLabel: string
  selectedSchool: SchoolInsight | null
  schoolInsights: SchoolInsight[]
  sortedSchools: SchoolInsight[]
  onHoverSchool?: (schoolId: string | null) => void
  onSelectSchool: (schoolId: string | null) => void
}) {
  const { scopeLabel, selectedSchool, schoolInsights, sortedSchools, onHoverSchool, onSelectSchool } = props
  return (
    <>
      <div className="school-list-workspace">
        <div className="school-list-workspace__full-width" style={{ marginBottom: '1.5rem' }}>
          <ScatterPlotChart
            title={`${scopeLabel} 各校發展熱點分析矩陣`}
            subtitle={`以 ${scopeLabel} 總學生數為分母計算佔比變動`}
            xLabel="學生數"
            yLabel={`${scopeLabel} 佔比變動率 (%)`}
            points={sortedSchools.map((school) => {
              const totalStudentsInScope = schoolInsights.reduce((sum, s) => sum + s.currentStudents, 0);
              return {
                id: school.id,
                label: school.name,
                x: school.currentStudents,
                y: (school.delta / Math.max(totalStudentsInScope, 1)) * 100,
                size: school.currentStudents,
              };
            })}
            activePointId={selectedSchool?.id ?? null}
            onHoverPoint={onHoverSchool}
            onSelectPoint={onSelectSchool}
            className="matrix-chart-premium"
          />
        </div>

        <SchoolDataTable schools={schoolInsights} selectedSchoolId={selectedSchool?.id ?? null} onSelectSchool={onSelectSchool} onHoverSchool={onHoverSchool} scopeLabel={scopeLabel} />
      </div>
    </>
  )
}

export function SchoolDetailFocus(props: {
  selectedSchool: SchoolInsight | null
  schoolPanelTitle?: string
  onSetWorkbenchView: (view: SchoolWorkbenchView) => void
}) {
  const { selectedSchool, schoolPanelTitle, onSetWorkbenchView } = props
  return (
    <>
    <section className="dashboard-card school-detail-shell__topbar school-detail-shell__topbar--focus dashboard-card--premium" style={{ marginBottom: '1.25rem' }}>
      <div className="dashboard-card__head">
        <div className="panel-heading__stack">
          <h3 className="dashboard-card__title">{selectedSchool?.name ?? schoolPanelTitle ?? '單校分析'}</h3>
          <p className="dashboard-card__subtitle">資料註記</p>
        </div>

        <div className="dashboard-card__actions">
          <div className="school-workbench-tabs school-workbench-tabs--focus" role="tablist" aria-label="校別概況分頁">
            <button type="button" role="tab" aria-selected={false} className="chip" onClick={() => onSetWorkbenchView('list')}>
              回到各校分析
            </button>
            <button type="button" role="tab" aria-selected={true} className="chip chip--active">
              資料註記
            </button>
          </div>
        </div>
      </div>
    </section>

      {selectedSchool ? (
        <SchoolNotesView selectedSchool={selectedSchool} />
      ) : (
        <div className="empty-state">請先點選地圖學校或表格列，右側就會切到單校分析。</div>
      )}
    </>
  )
}
