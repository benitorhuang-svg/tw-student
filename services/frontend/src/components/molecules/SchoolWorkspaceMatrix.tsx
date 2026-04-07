import React from 'react'
import { ScatterPlotChart } from '../organisms/ScatterPlotChart'
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

export const SchoolWorkspaceMatrix: React.FC<SchoolWorkspaceMatrixProps> = React.memo(({
  isExpanded,
  onToggle,
  sortedSchools,
  schoolInsights,
  hoveredSchoolId,
  selectedSchoolId,
  onHoverSchool,
  onSelectSchool,
}) => {
  const points = React.useMemo(() => {
    const totalStudentsInScope = schoolInsights.reduce((sum, s) => sum + s.currentStudents, 0)
    return sortedSchools.map((school) => ({
      id: school.id,
      label: school.name,
      x: school.currentStudents,
      y: (school.delta / Math.max(totalStudentsInScope, 1)) * 100,
      size: school.currentStudents,
    }))
  }, [sortedSchools, schoolInsights])

  return (
    <AccordionItem
      id="matrix-workspace"
      title="學校成長潛力矩陣"
      isExpanded={isExpanded}
      onToggle={onToggle}
      style={{ animationDelay: '0.05s' }}
    >
      <ScatterPlotChart
        title=""
        subtitle={null}
        xLabel="學生數"
        yLabel="鄉鎮佔比變動率 (%)"
        points={points}
        activePointId={hoveredSchoolId ?? selectedSchoolId ?? null}
        onHoverPoint={onHoverSchool}
        onSelectPoint={onSelectSchool}
        className="matrix-chart-premium"
        showHeader={false}
        flat={true}
      />
    </AccordionItem>
  )
})

export default SchoolWorkspaceMatrix
