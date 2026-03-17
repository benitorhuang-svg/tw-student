import React from 'react'
import AccordionItem from '../atoms/AccordionItem'

type OverviewAccordionProps = {
  expandedSections: Record<string, boolean>
  onToggleSection: (id: string) => void
  heroSection: React.ReactNode
  matrixSection: React.ReactNode
  trendSection: React.ReactNode
  treemapSection: React.ReactNode
  rankingSection: React.ReactNode
}

export const OverviewAccordion: React.FC<OverviewAccordionProps> = ({
  expandedSections,
  onToggleSection,
  heroSection,
  matrixSection,
  trendSection,
  treemapSection,
  rankingSection
}) => {
  return (
    <div className="overview-accordion">
      {heroSection && (
        <div className="overview-hero-direct">
          {heroSection}
        </div>
      )}

      <AccordionItem
        id="matrix"
        title="全台縣市成長潛力矩陣"
        isExpanded={expandedSections.matrix}
        onToggle={onToggleSection}
        style={{ animationDelay: '0.1s' }}
      >
        {React.isValidElement(matrixSection) ? React.cloneElement(matrixSection as React.ReactElement<any>, { flat: true }) : matrixSection}
      </AccordionItem>

      <AccordionItem
        id="trend"
        title="全台各級學制歷年學生人數"
        isExpanded={expandedSections.trend}
        onToggle={onToggleSection}
        style={{ animationDelay: '0.2s' }}
      >
        {React.isValidElement(trendSection) ? React.cloneElement(trendSection as React.ReactElement<any>, { flat: true }) : trendSection}
      </AccordionItem>

      <AccordionItem
        id="ranking"
        title="全台縣市規模排名"
        isExpanded={expandedSections.ranking}
        onToggle={onToggleSection}
        style={{ animationDelay: '0.25s' }}
      >
        {React.isValidElement(rankingSection) ? React.cloneElement(rankingSection as React.ReactElement<any>, { flat: true }) : rankingSection}
      </AccordionItem>

      <AccordionItem
        id="treemap"
        title="各區域學生規模分佈比例"
        isExpanded={expandedSections.treemap}
        onToggle={onToggleSection}
        style={{ animationDelay: '0.3s' }}
      >
        {React.isValidElement(treemapSection) ? React.cloneElement(treemapSection as React.ReactElement<any>, { flat: true }) : treemapSection}
      </AccordionItem>
    </div>
  )
}

export default OverviewAccordion
