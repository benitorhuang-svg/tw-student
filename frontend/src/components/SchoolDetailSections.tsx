import React from 'react'
import SchoolDataTable from './SchoolDataTable'
import SchoolNotesView from './SchoolNotesView'
import SchoolWorkspaceMatrix from './molecules/SchoolWorkspaceMatrix'
import SchoolFocusHero from './molecules/SchoolFocusHero'
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
      <SchoolWorkspaceMatrix
        isExpanded={isMatrixExpanded}
        onToggle={() => setIsMatrixExpanded(!isMatrixExpanded)}
        scopeLabel={scopeLabel}
        sortedSchools={sortedSchools}
        schoolInsights={schoolInsights}
        hoveredSchoolId={hoveredSchoolId}
        selectedSchoolId={selectedSchool?.id}
        onHoverSchool={onHoverSchool}
        onSelectSchool={onSelectSchool}
      />

      <SchoolDataTable 
        schools={schoolInsights} 
        selectedSchoolId={selectedSchool?.id ?? null} 
        onSelectSchool={onSelectSchool} 
        onHoverSchool={onHoverSchool} 
        scopeLabel={scopeLabel} 
      />
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
      <SchoolFocusHero 
        selectedSchool={selectedSchool} 
        schoolPanelTitle={schoolPanelTitle} 
        onSetWorkbenchView={onSetWorkbenchView} 
      />

      {selectedSchool ? (
        <SchoolNotesView selectedSchool={selectedSchool} />
      ) : (
        <div className="dashboard-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div className="empty-state">請先從左側列表選擇學校，以進入深度分析模式。</div>
        </div>
      )}
    </div>
  )
}
