import React from 'react'
import AccordionItem from '../atoms/AccordionItem'
import SchoolDataTable from '../SchoolDataTable'
import SchoolWorkspaceMatrix from '../molecules/SchoolWorkspaceMatrix'
import type { SchoolInsight } from '../../lib/analytics'
import '../../styles/templates/dashboard-shell/01-premium-cards-system.css'

type SchoolDetailWorkspaceProps = {
  scopeLabel: string
  selectedSchool: SchoolInsight | null
  schoolInsights: SchoolInsight[]
  sortedSchools: SchoolInsight[]
  onHoverSchool?: (schoolId: string | null) => void
  onSelectSchool: (schoolId: string | null) => void
  hoveredSchoolId?: string | null
}

/**
 * Organism: SchoolDetailWorkspace
 * 管理學校列表、搜尋與矩陣分佈
 */
export const SchoolDetailWorkspace: React.FC<SchoolDetailWorkspaceProps> = ({
  scopeLabel,
  selectedSchool,
  schoolInsights,
  sortedSchools,
  onHoverSchool,
  onSelectSchool,
  hoveredSchoolId
}) => {
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    matrix: true,
    table: false
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

export default SchoolDetailWorkspace
