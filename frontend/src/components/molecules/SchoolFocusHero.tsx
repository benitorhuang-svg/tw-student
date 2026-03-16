import React from 'react'
import type { SchoolInsight } from '../../lib/analytics'
import type { SchoolWorkbenchView } from '../schoolDetail.types'

type SchoolFocusHeroProps = {
  selectedSchool: SchoolInsight | null
  schoolPanelTitle?: string
  onSetWorkbenchView: (view: SchoolWorkbenchView) => void
}

const SchoolFocusHero: React.FC<SchoolFocusHeroProps> = ({
  selectedSchool,
  schoolPanelTitle,
  onSetWorkbenchView,
}) => {
  return (
    <header className="school-focus-hero">
      <div className="school-focus-hero__content">
        <h2 className="school-focus-hero__title">{selectedSchool?.name ?? schoolPanelTitle ?? '單校分析'}</h2>
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
  )
}

export default SchoolFocusHero
