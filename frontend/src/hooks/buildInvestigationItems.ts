import type {
  CountyDetailDataset,
  DataNote,
  EducationLevelFilter,
  EducationSummaryDataset,
  ManagementTypeFilter,
} from '../data/educationData'
import type { CountySummary } from '../lib/analytics'
import {
  formatAcademicYear,
  getTownshipScopeSummaryFromSummary,
} from '../lib/analytics'
import type { InvestigationItem, InvestigationFilter } from './types'
import { severityRank, buildSummarySeriesRows, resolveSummarySeries } from './atlasHelpers'

export function classifyInvestigation(item: InvestigationItem): InvestigationFilter {
  return item.category
}

export function buildInvestigationItems({
  summaryDataset,
  countySummaries,
  selectedCounty,
  selectedCountyDetail,
  selectedTownshipId,
  selectedTownshipSummary,
  scopeNotes,
  filters,
}: {
  summaryDataset: EducationSummaryDataset
  countySummaries: CountySummary[]
  selectedCounty: EducationSummaryDataset['counties'][number] | null
  selectedCountyDetail: CountyDetailDataset | null
  selectedTownshipId: string | null
  selectedTownshipSummary: ReturnType<typeof getTownshipScopeSummaryFromSummary>
  scopeNotes: DataNote[]
  filters: {
    educationLevel: EducationLevelFilter
    managementType: ManagementTypeFilter
  }
}) {
  const items = new Map<string, InvestigationItem>()

  const register = (item: InvestigationItem) => {
    if (!items.has(item.id) && item.seriesRows.length > 0) {
      items.set(item.id, item)
    }
  }

  scopeNotes.forEach((note, index) => {
    if (selectedTownshipSummary && selectedCounty && selectedTownshipId) {
      const townshipRecord = selectedCounty.towns.find((township) => township.id === selectedTownshipId)
      const seriesRows = townshipRecord
        ? buildSummarySeriesRows(resolveSummarySeries(townshipRecord.summaries, filters.educationLevel, filters.managementType))
        : []

      register({
        id: `scope-town-${selectedTownshipSummary.label}-${note.type}-${index}`,
        scope: '鄉鎮',
        category: note.type === '缺年度' ? '缺年度' : note.type === '停辦' ? '停辦/整併' : '正式註記',
        title: `${selectedTownshipSummary.label} / ${note.type}`,
        detail: note.message,
        meta: note.years?.length ? `涉及年度: ${note.years.join('、')}` : selectedCounty.name,
        severity: note.severity,
        actionable: false,
        seriesRows,
        downloadName: `${selectedTownshipSummary.label}-${note.type}-原始序列.csv`,
      })
      return
    }

    if (selectedCounty) {
      register({
        id: `scope-county-${selectedCounty.name}-${note.type}-${index}`,
        scope: '縣市',
        category: note.type === '缺年度' ? '缺年度' : note.type === '停辦' ? '停辦/整併' : '正式註記',
        title: `${selectedCounty.name} / ${note.type}`,
        detail: note.message,
        meta: note.years?.length ? `涉及年度: ${note.years.join('、')}` : selectedCounty.region,
        severity: note.severity,
        actionable: false,
        seriesRows: buildSummarySeriesRows(resolveSummarySeries(selectedCounty.summaries, filters.educationLevel, filters.managementType)),
        downloadName: `${selectedCounty.name}-${note.type}-原始序列.csv`,
      })
      return
    }

    const nationalSeriesRows = summaryDataset.years.map((year) => ({
      year,
      students: countySummaries.reduce((sum, county) => sum + (county.trend.find((point) => point.year === year)?.value ?? 0), 0),
      schools: countySummaries.reduce((sum, county) => sum + (county.trend.find((point) => point.year === year)?.year ? county.schools : 0), 0),
    }))

    register({
      id: `scope-national-${note.type}-${index}`,
      scope: '全台',
      category: note.type === '缺年度' ? '缺年度' : note.type === '停辦' ? '停辦/整併' : '正式註記',
      title: `全台 / ${note.type}`,
      detail: note.message,
      meta: note.years?.length ? `涉及年度: ${note.years.join('、')}` : '全台總覽',
      severity: note.severity,
      actionable: false,
      seriesRows: nationalSeriesRows,
      downloadName: `全台-${note.type}-原始序列.csv`,
    })
  })

  selectedCountyDetail?.towns.forEach((township) => {
    const townshipSummaryRecord = selectedCounty?.towns.find((item) => item.id === township.id)
    const townshipSeriesRows = townshipSummaryRecord
      ? buildSummarySeriesRows(resolveSummarySeries(townshipSummaryRecord.summaries, filters.educationLevel, filters.managementType))
      : []

    township.dataNotes?.forEach((note, index) => {
      register({
        id: `town-${township.id}-${note.type}-${index}`,
        scope: '鄉鎮',
        category: note.type === '缺年度' ? '缺年度' : note.type === '停辦' ? '停辦/整併' : '正式註記',
        title: `${township.name} / ${note.type}`,
        detail: note.message,
        meta: selectedCountyDetail.county.name,
        severity: note.severity,
        actionable: false,
        seriesRows: townshipSeriesRows,
        downloadName: `${township.name}-${note.type}-原始序列.csv`,
      })
    })

    township.schools.forEach((school) => {
      const schoolSeriesRows = school.yearlyStudents.map((entry) => ({
        year: entry.year,
        students: entry.students,
        flags: [
          ...(entry.isMissing ? ['缺值'] : []),
          ...(entry.isEstimated ? ['估算'] : []),
          ...(school.missingYears?.includes(entry.year) ? ['列於 missingYears'] : []),
        ],
      }))

      if (school.status && school.status !== '正常') {
        register({
          id: `status-${school.id}-${school.status}`,
          scope: '學校',
          category: school.status === '待確認' ? '待確認' : '停辦/整併',
          title: `${school.name} / ${school.status}`,
          detail: school.status === '待確認' ? '此校狀態仍待人工確認。' : '此校在正式資料中被標記為非一般持續營運狀態。',
          meta: `${township.name} | ${school.educationLevel}`,
          severity: school.status === '待確認' ? 'critical' : 'warning',
          actionable: true,
          seriesRows: schoolSeriesRows,
          downloadName: `${school.name}-${school.status}-原始序列.csv`,
        })
      }

      if (school.missingYears && school.missingYears.length > 0) {
        register({
          id: `missing-${school.id}`,
          scope: '學校',
          category: '缺年度',
          title: `${school.name} / 缺年度`,
          detail: `缺少 ${school.missingYears.map((year) => formatAcademicYear(year)).join('、')} 的正式學生數紀錄。`,
          meta: `${township.name} | ${school.educationLevel}`,
          severity: 'warning',
          actionable: true,
          seriesRows: schoolSeriesRows,
          downloadName: `${school.name}-缺年度-原始序列.csv`,
        })
      }

      school.dataNotes?.forEach((note, index) => {
        register({
          id: `school-note-${school.id}-${note.type}-${index}`,
          scope: '學校',
          category: note.type === '缺年度' ? '缺年度' : note.type === '停辦' ? '停辦/整併' : '正式註記',
          title: `${school.name} / ${note.type}`,
          detail: note.message,
          meta: `${township.name} | ${school.educationLevel}`,
          severity: note.severity,
          actionable: false,
          seriesRows: schoolSeriesRows,
          downloadName: `${school.name}-${note.type}-原始序列.csv`,
        })
      })
    })
  })

  return [...items.values()]
    .sort((left, right) => severityRank(right.severity) - severityRank(left.severity))
    .slice(0, 12)
}
