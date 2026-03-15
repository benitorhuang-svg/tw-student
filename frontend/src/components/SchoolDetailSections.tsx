import React from 'react'
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
  hoveredSchoolId?: string | null
}) {
  const { scopeLabel, selectedSchool, schoolInsights, sortedSchools, onHoverSchool, onSelectSchool, hoveredSchoolId } = props
  const [isMatrixExpanded, setIsMatrixExpanded] = React.useState(true)

  return (
    <div className="school-list-workspace">
      <div className="overview-accordion" style={{ marginBottom: '1rem' }}>
        <div className={`accordion-item ${isMatrixExpanded ? 'accordion-item--expanded' : ''}`}>
          <button 
            className="accordion-header" 
            onClick={() => setIsMatrixExpanded(!isMatrixExpanded)}
            aria-expanded={isMatrixExpanded}
          >
            <span className="accordion-icon">{isMatrixExpanded ? '−' : '+'}</span>
            <span className="accordion-title">熱點分析矩陣 (鄉鎮分析)</span>
          </button>
          <div className="accordion-content">
            <ScatterPlotChart
              title="熱點分析矩陣 (鄉鎮分析)"
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
              activePointId={hoveredSchoolId ?? selectedSchool?.id ?? null}
              onHoverPoint={onHoverSchool}
              onSelectPoint={onSelectSchool}
              className="matrix-chart-premium"
              showHeader={false}
            />
          </div>
        </div>
      </div>

      <SchoolDataTable schools={schoolInsights} selectedSchoolId={selectedSchool?.id ?? null} onSelectSchool={onSelectSchool} onHoverSchool={onHoverSchool} scopeLabel={scopeLabel} />
    </div>
  )
}

export function SchoolDetailFocus(props: {
  selectedSchool: SchoolInsight | null
  schoolPanelTitle?: string
  onSetWorkbenchView: (view: SchoolWorkbenchView) => void
}) {
  const { selectedSchool, schoolPanelTitle, onSetWorkbenchView } = props
  return (
    <div className="school-focus-view">
      <header className="school-focus-hero">
        <div className="school-focus-hero__content">
          <h2 className="school-focus-hero__title">{selectedSchool?.name ?? schoolPanelTitle ?? '單校分析'}</h2>
          <div className="school-focus-hero__meta">
            {selectedSchool?.countyName} · {selectedSchool?.townshipName} · {selectedSchool?.educationLevel}
          </div>
        </div>
        
        <div className="school-focus-hero__tabs" role="tablist">
          <button type="button" role="tab" className="workbench-tab workbench-tab--back" onClick={() => onSetWorkbenchView('list')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            返回列表
          </button>
          <div className="workbench-tab workbench-tab--active">
            資料註記
          </div>
        </div>
      </header>

      {selectedSchool ? (
        <SchoolNotesView selectedSchool={selectedSchool} />
      ) : (
        <div className="empty-state">請先從左側列表選擇學校，以進入深度分析模式。</div>
      )}
    </div>
  )
}
