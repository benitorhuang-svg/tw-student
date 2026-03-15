import React from 'react'

type AccordionItemProps = {
  id: string
  title: string
  isExpanded: boolean
  onToggle: (id: string) => void
  children: React.ReactNode
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
  id,
  title,
  isExpanded,
  onToggle,
  children
}) => {
  return (
    <div className={`accordion-item ${isExpanded ? 'accordion-item--expanded' : ''}`}>
      <button
        className="accordion-header"
        onClick={() => onToggle(id)}
        aria-expanded={isExpanded}
      >
        <span className="accordion-icon">{isExpanded ? '−' : '+'}</span>
        <span className="accordion-title">{title}</span>
      </button>
      <div className="accordion-content">
        {children}
      </div>
    </div>
  )
}

type OverviewAccordionProps = {
  expandedSections: Record<string, boolean>
  onToggleSection: (id: string) => void
  matrixSection: React.ReactNode
  trendSection: React.ReactNode
  treemapSection: React.ReactNode
}

export const OverviewAccordion: React.FC<OverviewAccordionProps> = ({
  expandedSections,
  onToggleSection,
  matrixSection,
  trendSection,
  treemapSection
}) => {
  return (
    <div className="overview-accordion">
      <AccordionItem
        id="matrix"
        title="熱點分析矩陣 (全台總覽)"
        isExpanded={expandedSections.matrix}
        onToggle={onToggleSection}
      >
        {matrixSection}
      </AccordionItem>

      <AccordionItem
        id="trend"
        title="全台各學制歷年學生數"
        isExpanded={expandedSections.trend}
        onToggle={onToggleSection}
      >
        {trendSection}
      </AccordionItem>

      <AccordionItem
        id="treemap"
        title="各地區學生分佈比例"
        isExpanded={expandedSections.treemap}
        onToggle={onToggleSection}
      >
        {treemapSection}
      </AccordionItem>
    </div>
  )
}

export default OverviewAccordion
