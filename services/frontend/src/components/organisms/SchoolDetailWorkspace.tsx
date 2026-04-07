import React, { useMemo } from 'react'
import AccordionItem from '../atoms/AccordionItem'
import { ScatterPlotChart } from './ScatterPlotChart'
import SchoolDataTable from '../SchoolDataTable'
import type { SchoolInsight } from '../../lib/analytics'
import '../../styles/templates/dashboard-shell/01-premium-cards-system.css'

type SchoolDetailWorkspaceProps = {
  scopeLabel: string
  selectedSchool: SchoolInsight | null
  schoolInsights: SchoolInsight[]
  hoveredSchoolId?: string | null
  onHoverSchool?: (schoolId: string | null) => void
  onSelectSchool: (schoolId: string | null) => void
}

/**
 * Organism: SchoolDetailWorkspace
 * 管理學校列表、搜尋與矩陣分佈
 */
export const SchoolDetailWorkspace: React.FC<SchoolDetailWorkspaceProps> = ({
  scopeLabel,
  selectedSchool,
  schoolInsights,
  hoveredSchoolId,
  onHoverSchool,
  onSelectSchool,
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

  /* --- 散佈圖資料點：與鄉鎮成長潛力矩陣同樣邏輯 --- */
  const matrixPoints = useMemo(() => {
    const totalStudentsInScope = schoolInsights.reduce((sum, s) => sum + s.currentStudents, 0)
    return schoolInsights.map((school) => ({
      id: school.id,
      label: school.name,
      x: school.currentStudents,
      y: (school.delta / Math.max(totalStudentsInScope, 1)) * 100,
      size: school.currentStudents,
    }))
  }, [schoolInsights])

  return (
    <div className="school-list-workspace overview-accordion">

      {/* ── 學校成長潛力矩陣 ── */}
      <AccordionItem
        id="matrix"
        title="學校成長潛力矩陣"
        isExpanded={expandedSections.matrix}
        onToggle={toggleSection}
      >
        <ScatterPlotChart
          title=""
          subtitle={null}
          xLabel="學生數"
          yLabel="範圍佔比變動率 (%)"
          points={matrixPoints}
          activePointId={hoveredSchoolId ?? selectedSchool?.id ?? null}
          onHoverPoint={onHoverSchool}
          onSelectPoint={(id) => onSelectSchool(id)}
          className="matrix-chart-premium"
          showHeader={false}
          flat={true}
        />
      </AccordionItem>

      {/* ── 學校資料明細 ── */}
      <AccordionItem
        id="table"
        title={`學校資料明細 (${scopeLabel})`}
        isExpanded={expandedSections.table}
        onToggle={toggleSection}
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
