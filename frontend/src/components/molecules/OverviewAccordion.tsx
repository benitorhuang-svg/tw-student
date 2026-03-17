import React from 'react'
import AccordionItem from '../atoms/AccordionItem'

type OverviewAccordionProps = {
  expandedSections: Record<string, boolean>
  onToggleSection: (id: string) => void
  matrixSection: React.ReactNode
  trendSection: React.ReactNode
  treemapSection: React.ReactNode
  rankingSection: React.ReactNode
}

export const OverviewAccordion: React.FC<OverviewAccordionProps> = ({
  expandedSections,
  onToggleSection,
  matrixSection,
  trendSection,
  treemapSection,
  rankingSection
}) => {
  return (
    <div className="overview-accordion">
      <AccordionItem
        id="matrix"
        title="全國消長分佈矩陣"
        isExpanded={expandedSections.matrix}
        onToggle={onToggleSection}
        style={{ animationDelay: '0.1s' }}
      >
        {matrixSection}
      </AccordionItem>

      <AccordionItem
        id="trend"
        title="全台各級學制歷年學生人數"
        isExpanded={expandedSections.trend}
        onToggle={onToggleSection}
        style={{ animationDelay: '0.2s' }}
      >
        {trendSection}
      </AccordionItem>

      <AccordionItem
        id="ranking"
        title="全台縣市規模排名"
        isExpanded={expandedSections.ranking}
        onToggle={onToggleSection}
        style={{ animationDelay: '0.25s' }}
      >
        {rankingSection}
      </AccordionItem>

      <AccordionItem
        id="treemap"
        title="各區域學生規模分佈比例"
        isExpanded={expandedSections.treemap}
        onToggle={onToggleSection}
        style={{ animationDelay: '0.3s' }}
      >
        {treemapSection}
      </AccordionItem>
    </div>
  )
}

export default OverviewAccordion
