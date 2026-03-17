import React from 'react'
import ScatterPlotChart from '../ScatterPlotChart'
import type { SchoolInsight } from '../../lib/analytics'
import AccordionItem from '../atoms/AccordionItem'

type SchoolWorkspaceMatrixProps = {
  isExpanded: boolean
  onToggle: () => void
  scopeLabel: string
  sortedSchools: SchoolInsight[]
  schoolInsights: SchoolInsight[]
  hoveredSchoolId?: string | null
  selectedSchoolId?: string | null
  onHoverSchool?: (id: string | null) => void
  onSelectSchool: (id: string | null) => void
}

const SchoolWorkspaceMatrix: React.FC<SchoolWorkspaceMatrixProps> = ({
  isExpanded,
  onToggle,
  scopeLabel,
  sortedSchools,
  schoolInsights,
  hoveredSchoolId,
  selectedSchoolId,
  onHoverSchool,
  onSelectSchool,
}) => {
  return (
    <div className="overview-accordion" style={{ marginBottom: '1rem' }}>
      <AccordionItem
        id="matrix-workspace"
        title="學校規模消長矩陣 (行政區)"
        isExpanded={isExpanded}
        onToggle={onToggle}
      >
        <ScatterPlotChart
          title="學校規模消長矩陣 (行政區)"
          subtitle={`以 ${scopeLabel} 總學生數為分母計算佔比變動`}
          xLabel="學生數"
          yLabel={`${scopeLabel} 佔比變動率 (%)`}
          points={sortedSchools.map((school) => {
            const totalStudentsInScope = schoolInsights.reduce((sum, s) => sum + s.currentStudents, 0)
            return {
              id: school.id,
              label: school.name,
              x: school.currentStudents,
              y: (school.delta / Math.max(totalStudentsInScope, 1)) * 100,
              size: school.currentStudents,
            }
          })}
          activePointId={hoveredSchoolId ?? selectedSchoolId ?? null}
          onHoverPoint={onHoverSchool}
          onSelectPoint={onSelectSchool}
          className="matrix-chart-premium"
          showHeader={false}
        />
      </AccordionItem>
    </div>
  )
}

export default SchoolWorkspaceMatrix
