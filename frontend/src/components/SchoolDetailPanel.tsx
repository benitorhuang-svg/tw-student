import SchoolDataTable from './SchoolDataTable'
import TrendChart from './TrendChart'
import { formatDelta, formatPercent, formatStudents, type SchoolInsight } from '../lib/analytics'
import type { AcademicYear } from '../hooks/types'

type ScopeSummaryLabel = {
  label: string
} | null

type SchoolDetailPanelProps = {
  selectedCountyName: string | null
  countyDetailError: string | null
  isCountyDetailLoading: boolean
  schoolInsights: SchoolInsight[]
  selectedSchool: SchoolInsight | null
  schoolPanelTitle: string
  activeYear: AcademicYear
  selectedTownshipSummary: ScopeSummaryLabel
  selectedCountySummary: ScopeSummaryLabel
  onSelectSchool: (schoolId: string | null) => void
}

function SchoolDetailPanel({
  selectedCountyName,
  countyDetailError,
  isCountyDetailLoading,
  schoolInsights,
  selectedSchool,
  schoolPanelTitle,
  activeYear,
  selectedTownshipSummary,
  selectedCountySummary,
  onSelectSchool,
}: SchoolDetailPanelProps) {
  return (
    <section className="panel school-detail-panel" data-testid="school-detail-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">學校資料表</p>
          <h3>{schoolPanelTitle}</h3>
        </div>
        <p className="panel-heading__meta">保留排序、匯出與單校焦點；切換範圍時表格會同步刷新。</p>
      </div>

      {!selectedCountyName ? (
        <div className="empty-state">請先從地圖或排行選擇縣市，系統才會載入該縣市的學校明細。</div>
      ) : countyDetailError ? (
        <div className="empty-state">{countyDetailError}</div>
      ) : isCountyDetailLoading ? (
        <div className="empty-state" data-testid="county-detail-loading">正在載入 {selectedCountyName} 的學校細節資料...</div>
      ) : schoolInsights.length === 0 ? (
        <div className="empty-state">目前篩選條件沒有對應學校，請放寬條件或切換分析層級。</div>
      ) : (
        <>
          <SchoolDataTable
            schools={schoolInsights}
            selectedSchoolId={selectedSchool?.id ?? null}
            onSelectSchool={onSelectSchool}
            scopeLabel={selectedTownshipSummary?.label ?? selectedCountySummary?.label ?? selectedCountyName}
          />

          {selectedSchool ? (
            <div className="school-focus" data-testid="school-focus-panel">
              <div className="school-focus__summary">
                <div>
                  <p className="eyebrow">單校焦點</p>
                  <h3>{selectedSchool.name}</h3>
                  <p>
                    {selectedSchool.countyName} / {selectedSchool.townshipName} / {selectedSchool.educationLevel} / {selectedSchool.managementType}
                  </p>
                </div>
                <div className="school-focus__statline">
                  <strong>{formatStudents(selectedSchool.currentStudents)} 人</strong>
                  <span>
                    {formatDelta(selectedSchool.delta)} 人 / {formatPercent(selectedSchool.deltaRatio)}
                  </span>
                </div>
              </div>

              <TrendChart chartId="school-trend" title={`${selectedSchool.name} 歷年學生數`} subtitle="單校趨勢會在縣市細節載入後提供" points={selectedSchool.trend} activeYear={activeYear} />

              {selectedSchool.dataNotes && selectedSchool.dataNotes.length > 0 ? (
                <div className="note-stack" data-testid="school-notes">
                  {selectedSchool.dataNotes.map((note) => (
                    <article key={`${selectedSchool.id}-${note.type}-${note.message}`} className={`data-note data-note--${note.severity}`} data-testid="data-note">
                      <strong>{note.type}</strong>
                      <span>{note.message}</span>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

export default SchoolDetailPanel
