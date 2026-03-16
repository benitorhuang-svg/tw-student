import React from 'react'
import ScatterPlotChart from '../ScatterPlotChart'
import type { SchoolInsight } from '../../lib/analytics'

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
      <div className={`accordion-item ${isExpanded ? 'accordion-item--expanded' : ''}`}>
        <button
          className="accordion-header"
          onClick={onToggle}
          aria-expanded={isExpanded}
        >
          <span className="accordion-icon">{isExpanded ? '−' : '+'}</span>
          <span className="accordion-title">熱點分析矩陣 (鄉鎮分析)</span>
        </button>
        <div className="accordion-content">
          <ScatterPlotChart
            title="熱點分析矩陣 (鄉鎮分析)"
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
        </div>
      </div>
    </div>
  )
}

export default SchoolWorkspaceMatrix
