import { useMemo } from 'react'

import { SchoolDetailFocus, SchoolDetailWorkspace } from './SchoolDetailSections'
import type { CountySchoolAtlasDataset } from '../data/educationData'
import type { SchoolInsight } from '../lib/analytics'
import type { AcademicYear } from '../hooks/types'
import type { SchoolWorkbenchView } from './schoolDetail.types'

type ScopeSummaryLabel = {
  label: string
} | null

type SchoolDetailPanelProps = {
  selectedCountyName: string | null
  countyDetailError: string | null
  isCountyDetailLoading: boolean
  schoolInsights: SchoolInsight[]
  countyWideSchoolInsights: SchoolInsight[]
  selectedSchool: SchoolInsight | null
  selectedCountySchoolAtlas?: CountySchoolAtlasDataset | null
  isCountySchoolAtlasLoading?: boolean
  countySchoolAtlasError?: string | null
  schoolPanelTitle?: string
  panelMode: 'workspace' | 'focus'
  activeYear: AcademicYear
  activeWorkbenchView: SchoolWorkbenchView
  selectedTownshipSummary: ScopeSummaryLabel
  selectedCountySummary: ScopeSummaryLabel
  highlightedSchoolId?: string | null
  onSetWorkbenchView: (view: SchoolWorkbenchView) => void
  onHoverSchool?: (schoolId: string | null) => void
  onSelectSchool: (schoolId: string | null) => void
}

function SchoolDetailPanel({
  selectedCountyName,
  countyDetailError,
  isCountyDetailLoading,
  schoolInsights,
  countyWideSchoolInsights,
  selectedSchool,
  selectedCountySchoolAtlas = null,
  isCountySchoolAtlasLoading = false,
  countySchoolAtlasError = null,
  schoolPanelTitle,
  panelMode,
  activeYear,
  activeWorkbenchView,
  selectedTownshipSummary,
  selectedCountySummary,
  highlightedSchoolId = null,
  onSetWorkbenchView,
  onHoverSchool,
  onSelectSchool,
}: SchoolDetailPanelProps) {
  const sortedSchools = useMemo(
    () => [...schoolInsights].sort((left, right) => right.currentStudents - left.currentStudents),
    [schoolInsights],
  )
  const selectedSchoolRank = selectedSchool ? sortedSchools.findIndex((school) => school.id === selectedSchool.id) + 1 : 0
  const scopeAverage = sortedSchools.length > 0
    ? Math.round(sortedSchools.reduce((sum, school) => sum + school.currentStudents, 0) / sortedSchools.length)
    : 0
  const scopeMedian = sortedSchools.length > 0
    ? sortedSchools[Math.floor((sortedSchools.length - 1) / 2)]?.currentStudents ?? 0
    : 0
  const scopeLabel = selectedTownshipSummary?.label ?? selectedCountySummary?.label ?? selectedCountyName ?? '目前範圍'
  const effectiveFocusView = selectedSchool && activeWorkbenchView === 'notes' ? 'notes' : 'analysis'
  const countyAverage = countyWideSchoolInsights.length > 0
    ? Math.round(countyWideSchoolInsights.reduce((sum, school) => sum + school.currentStudents, 0) / countyWideSchoolInsights.length)
    : scopeAverage
  const peerSchools = selectedSchool
    ? countyWideSchoolInsights
      .filter((school) => school.educationLevel === selectedSchool.educationLevel)
      .slice(0, 10)
    : []
  const peerCohort = selectedSchool
    ? countyWideSchoolInsights
      .filter((school) => school.educationLevel === selectedSchool.educationLevel)
      .sort((left, right) => right.currentStudents - left.currentStudents)
    : []
  const cohortRank = selectedSchool ? peerCohort.findIndex((school) => school.id === selectedSchool.id) + 1 : 0
  const scopeDistribution = useMemo(() => {
    const totals = new Map<string, number>()
    schoolInsights.forEach((school) => {
      totals.set(school.educationLevel, (totals.get(school.educationLevel) ?? 0) + school.currentStudents)
    })

    const totalStudents = [...totals.values()].reduce((sum, value) => sum + value, 0)
    return [...totals.entries()]
      .map(([label, value]) => ({ label, value, share: totalStudents === 0 ? 0 : value / totalStudents }))
      .sort((left, right) => right.value - left.value)
  }, [schoolInsights])
  const sizeDistributionGroups = useMemo(() => {
    const groups = new Map<string, number[]>()
    schoolInsights.forEach((school) => {
      groups.set(school.educationLevel, [...(groups.get(school.educationLevel) ?? []), school.currentStudents])
    })
    return [...groups.entries()].map(([label, values]) => ({ id: label, label, values }))
  }, [schoolInsights])
  const selectedSchoolAtlasEntry = useMemo(() => {
    if (!selectedSchool) return null

    const atlasEntry = selectedCountySchoolAtlas?.schools.find((entry) => entry.code === selectedSchool.code)
    if (atlasEntry) return atlasEntry

    if ((selectedSchool.studentCompositions?.length ?? 0) === 0) return null

    return {
      code: selectedSchool.code,
      primaryName: selectedSchool.name,
      aliases: [],
      levels: [{
        schoolId: selectedSchool.id,
        name: selectedSchool.name,
        educationLevel: selectedSchool.educationLevel,
        managementType: selectedSchool.managementType,
        countyId: '',
        countyName: selectedSchool.countyName,
        townshipId: selectedSchool.townshipId,
        townshipName: selectedSchool.townshipName,
        coordinates: { longitude: 0, latitude: 0 },
        address: selectedSchool.address,
        phone: selectedSchool.phone,
        website: selectedSchool.website,
        yearlyStudents: selectedSchool.trend.map((point) => ({ year: point.year, students: point.value })),
        studentCompositions: selectedSchool.studentCompositions ?? [],
        status: selectedSchool.status,
        missingYears: selectedSchool.missingYears,
        dataNotes: selectedSchool.dataNotes,
      }],
    }
  }, [selectedCountySchoolAtlas, selectedSchool])

  return (
    <section className="panel school-detail-panel" data-testid="school-detail-panel">
      {!selectedCountyName ? (
        <div className="empty-state">請先從地圖或排行選擇縣市，系統才會載入該縣市的學校明細。</div>
      ) : countyDetailError ? (
        <div className="empty-state">{countyDetailError}</div>
      ) : isCountyDetailLoading ? (
        <div className="empty-state" data-testid="county-detail-loading">正在載入 {selectedCountyName} 的學校細節資料...</div>
      ) : schoolInsights.length === 0 ? (
        <div className="empty-state">目前篩選條件沒有對應學校，請放寬條件或切換分析層級。</div>
      ) : (
        <div className="school-detail-shell">
          {panelMode === 'workspace' ? (
            <SchoolDetailWorkspace scopeLabel={scopeLabel} activeYear={activeYear} schoolPanelTitle={schoolPanelTitle} selectedSchool={selectedSchool} schoolInsights={schoolInsights} sortedSchools={sortedSchools} scopeAverage={scopeAverage} scopeMedian={scopeMedian} sizeDistributionGroups={sizeDistributionGroups} scopeDistribution={scopeDistribution} onSetWorkbenchView={onSetWorkbenchView} onHoverSchool={onHoverSchool} onSelectSchool={onSelectSchool} />
          ) : null}

          {panelMode === 'focus' ? (
            <SchoolDetailFocus selectedSchool={selectedSchool} schoolPanelTitle={schoolPanelTitle} effectiveFocusView={effectiveFocusView} activeYear={activeYear} scopeLabel={scopeLabel} scopeAverage={scopeAverage} scopeMedian={scopeMedian} countyAverage={countyAverage} selectedSchoolRank={selectedSchoolRank} sortedSchoolsCount={sortedSchools.length} sortedSchoolsMax={sortedSchools[0]?.currentStudents ?? 0} cohortRank={cohortRank} cohortCount={peerCohort.length} peerSchools={peerSchools} selectedTownshipSummary={selectedTownshipSummary} highlightedSchoolId={highlightedSchoolId} selectedSchoolAtlasEntry={selectedSchoolAtlasEntry} isCountySchoolAtlasLoading={isCountySchoolAtlasLoading} countySchoolAtlasError={countySchoolAtlasError} onSetWorkbenchView={onSetWorkbenchView} onHoverSchool={onHoverSchool} onSelectSchool={onSelectSchool} />
          ) : null}
        </div>
      )}
    </section>
  )
}

export default SchoolDetailPanel
