import { useMemo } from 'react'

import { SchoolDetailFocus } from './SchoolDetailFocus'
import { SchoolDetailWorkspace } from './SchoolDetailWorkspace'
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

  if (!selectedCountyName) {
    return (
      <div className="dashboard-card" style={{ textAlign: 'center' }}>
        <div className="dashboard-card__body" style={{ padding: '40px' }}>
          <div className="empty-state">請先從地圖或排行選擇縣市，系統才會載入該縣市的學校明細。</div>
        </div>
      </div>
    )
  }

  if (countyDetailError) {
    return (
      <div className="dashboard-card" style={{ textAlign: 'center' }}>
        <div className="dashboard-card__body" style={{ padding: '40px' }}>
          <div className="empty-state">{countyDetailError}</div>
        </div>
      </div>
    )
  }

  if (isCountyDetailLoading) {
    return (
      <div className="dashboard-card" style={{ textAlign: 'center' }}>
        <div className="dashboard-card__body" style={{ padding: '40px' }}>
          <div className="empty-state" data-testid="county-detail-loading">正在載入 {selectedCountyName} 的學校細節資料...</div>
        </div>
      </div>
    )
  }

  if (schoolInsights.length === 0) {
    return (
      <div className="dashboard-card" style={{ textAlign: 'center' }}>
        <div className="dashboard-card__body" style={{ padding: '40px' }}>
          <div className="empty-state">目前篩選條件沒有對應學校，請放寬條件或切換分析層級。</div>
        </div>
      </div>
    )
  }

  return (
    <>
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
      ) : (
        <SchoolDetailFocus 
          selectedSchool={selectedSchool} 
          schoolInsights={schoolInsights} 
          onSetWorkbenchView={onSetWorkbenchView} 
        />
      )}
    </>
  )
}

export default SchoolDetailPanel
