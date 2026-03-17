import React from 'react'
import AccordionItem from './atoms/AccordionItem'
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
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    matrix: false,
    table: true
  })

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const isCurrentlyExpanded = prev[id]
      const next: Record<string, boolean> = {}
      Object.keys(prev).forEach(key => {
        next[key] = false
      })
      if (!isCurrentlyExpanded) {
        next[id] = true
      }
      return next
    })
  }

  return (
    <div className="school-list-workspace overview-accordion">
      <SchoolWorkspaceMatrix
        isExpanded={expandedSections.matrix}
        onToggle={() => toggleSection('matrix')}
        scopeLabel={scopeLabel}
        sortedSchools={sortedSchools}
        schoolInsights={schoolInsights}
        hoveredSchoolId={hoveredSchoolId}
        selectedSchoolId={selectedSchool?.id}
        onHoverSchool={onHoverSchool}
        onSelectSchool={onSelectSchool}
      />

      <AccordionItem
        id="school-table-accordion"
        title={`學校資料明細 (${scopeLabel})`}
        isExpanded={expandedSections.table}
        onToggle={() => toggleSection('table')}
        style={{ animationDelay: '0.1s' }}
      >
        <SchoolDataTable 
          schools={schoolInsights} 
          selectedSchoolId={selectedSchool?.id ?? null} 
          onSelectSchool={onSelectSchool} 
          onHoverSchool={onHoverSchool} 
          scopeLabel={scopeLabel} 
          flat={true}
        />
      </AccordionItem>
    </div>
  )
}

export function SchoolDetailFocus(props: {
  selectedSchool: SchoolInsight | null
  schoolPanelTitle?: string
  onSetWorkbenchView: (view: SchoolWorkbenchView) => void
}) {
  const { selectedSchool, schoolPanelTitle, onSetWorkbenchView } = props
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    hero: true,
    notes: false
  })

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const isCurrentlyExpanded = prev[id]
      const next: Record<string, boolean> = {}
      Object.keys(prev).forEach(key => {
        next[key] = false
      })
      if (!isCurrentlyExpanded) {
        next[id] = true
      }
      return next
    })
  }

  return (
    <div className="school-focus-view overview-accordion">
      <SchoolFocusHero 
        selectedSchool={selectedSchool} 
        schoolPanelTitle={schoolPanelTitle} 
        onSetWorkbenchView={onSetWorkbenchView}
        isExpanded={expandedSections.hero}
        onToggle={() => toggleSection('hero')}
      />

      {selectedSchool ? (
        <AccordionItem
          id="school-notes-accordion"
          title="資料註記與備註"
          isExpanded={expandedSections.notes}
          onToggle={() => toggleSection('notes')}
          style={{ animationDelay: '0.1s' }}
        >
          <SchoolNotesView selectedSchool={selectedSchool} flat={true} />
        </AccordionItem>
      ) : (
        <div className="dashboard-card" style={{ textAlign: 'center' }}>
          <div className="dashboard-card__body" style={{ padding: '40px' }}>
            <div className="empty-state">請先從左側列表選擇學校，以進入深度分析模式。</div>
          </div>
        </div>
      )}
    </div>
  )
}
