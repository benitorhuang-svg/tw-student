import React from 'react'
import type { SchoolInsight } from '../../lib/analytics'
import type { SchoolWorkbenchView } from '../schoolDetail.types'
import AccordionItem from '../atoms/AccordionItem'

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
          <button
            type="button"
            role="tab"
            className="workbench-tab workbench-tab--back"
            onClick={() => onSetWorkbenchView('list')}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 14, height: 14 }}
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            返回列表
          </button>
          <div className="workbench-tab workbench-tab--active">
            資料註記
          </div>
        </div>
      </header>
    </AccordionItem>
  )
}

export default SchoolFocusHero
