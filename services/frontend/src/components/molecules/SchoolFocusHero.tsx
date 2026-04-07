import React from 'react'
import type { SchoolInsight } from '../../lib/analytics'
import type { SchoolWorkbenchView } from '../schoolDetail.types'
import AccordionItem from '../atoms/AccordionItem'
import WorkbenchTab from '../atoms/WorkbenchTab'

type SchoolFocusHeroProps = {
  selectedSchool: SchoolInsight | null
  schoolPanelTitle?: string
  onSetWorkbenchView: (view: SchoolWorkbenchView) => void
  isExpanded?: boolean
  onToggle?: () => void
}

const SchoolFocusHero: React.FC<SchoolFocusHeroProps> = ({
  selectedSchool,
  schoolPanelTitle,
  onSetWorkbenchView,
  isExpanded = true,
  onToggle
}) => {
  return (
    <AccordionItem
      id="school-focus-hero"
      title={selectedSchool?.name ?? schoolPanelTitle ?? '單校分析'}
      isExpanded={isExpanded}
      onToggle={onToggle ?? (() => {})}
      style={{ animationDelay: '0.05s' }}
    >
      <header className="school-focus-hero">
        <div className="school-focus-hero__content" style={{ padding: '0 24px 20px' }}>
          <div className="school-focus-hero__meta">
            {selectedSchool?.countyName} · {selectedSchool?.townshipName} · {selectedSchool?.educationLevel}
          </div>
        </div>

        <div className="school-focus-hero__tabs" role="tablist">
          <WorkbenchTab 
            isBack 
            label="返回列表" 
            onClick={() => onSetWorkbenchView('list')} 
          />
          <WorkbenchTab 
            isActive 
            label="深度分析面板" 
          />
        </div>
      </header>
    </AccordionItem>
  )
}

export default SchoolFocusHero
