import { useMemo } from 'react'

import { SchoolDetailFocus, SchoolDetailWorkspace } from '../SchoolDetailSections'
import type { SchoolInsight } from '../../lib/analytics'
import type { SchoolWorkbenchView } from '../schoolDetail.types'

type ScopeSummaryLabel = {
  label: string
} | null

type SchoolDetailPanelProps = {
  selectedCountyName: string | null
  countyDetailError: string | null
  isCountyDetailLoading: boolean
  schoolInsights: SchoolInsight[]
  selectedSchool: SchoolInsight | null
  schoolPanelTitle?: string
  panelMode: 'workspace' | 'focus'
  selectedTownshipSummary: ScopeSummaryLabel
  selectedCountySummary: ScopeSummaryLabel
  onSetWorkbenchView: (view: SchoolWorkbenchView) => void
  onHoverSchool?: (schoolId: string | null) => void
  onSelectSchool: (schoolId: string | null) => void
  hoveredSchoolId?: string | null
}

function SchoolDetailPanel({
  selectedCountyName,
  countyDetailError,
  isCountyDetailLoading,
  schoolInsights,
  selectedSchool,
  schoolPanelTitle,
  panelMode,
  selectedTownshipSummary,
  selectedCountySummary,
  onSetWorkbenchView,
  onHoverSchool,
  onSelectSchool,
  hoveredSchoolId,
}: SchoolDetailPanelProps) {
  const sortedSchools = useMemo(
    () => [...schoolInsights].sort((left, right) => right.currentStudents - left.currentStudents),
    [schoolInsights],
  )
  
  const scopeLabel = selectedTownshipSummary?.label ?? selectedCountySummary?.label ?? selectedCountyName ?? '目前範圍'

  return (
    <section className="panel school-detail-panel" data-testid="school-detail-panel">
      {!selectedCountyName ? (
        <div className="dashboard-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div className="empty-state">請先從地圖或排行選擇縣市，系統才會載入該縣市的學校明細。</div>
        </div>
      ) : countyDetailError ? (
        <div className="dashboard-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div className="empty-state">{countyDetailError}</div>
        </div>
      ) : isCountyDetailLoading ? (
        <div className="dashboard-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div className="empty-state" data-testid="county-detail-loading">正在載入 {selectedCountyName} 的學校細節資料...</div>
        </div>
      ) : schoolInsights.length === 0 ? (
        <div className="dashboard-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div className="empty-state">目前篩選條件沒有對應學校，請放寬條件或切換分析層級。</div>
        </div>
      ) : (
        <div className="school-detail-shell">
          {panelMode === 'workspace' ? (
            <SchoolDetailWorkspace 
              scopeLabel={scopeLabel} 
              selectedSchool={selectedSchool} 
              schoolInsights={schoolInsights} 
              sortedSchools={sortedSchools} 
              onHoverSchool={onHoverSchool} 
              onSelectSchool={onSelectSchool}
              hoveredSchoolId={hoveredSchoolId}
            />
          ) : null}

          {panelMode === 'focus' ? (
            <SchoolDetailFocus selectedSchool={selectedSchool} schoolPanelTitle={schoolPanelTitle} onSetWorkbenchView={onSetWorkbenchView} />
          ) : null}
        </div>
      )}
    </section>
  )
}

export default SchoolDetailPanel
