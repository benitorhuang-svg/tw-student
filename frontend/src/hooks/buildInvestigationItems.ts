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
  getCountyRankingRows,
  getTownshipScopeSummaryFromSummary,
  formatStudents,
} from '../lib/analytics'
import type { InvestigationItem, InvestigationFilter } from './types'
import { severityRank, buildSummarySeriesRows, resolveSummarySeries } from './atlasHelpers'

export function classifyInvestigation(item: InvestigationItem): InvestigationFilter {
  if (item.title.includes('缺年度')) return '缺年度'
  if (item.title.includes('待確認')) return '待確認'
  if (item.title.includes('停辦') || item.title.includes('整併')) return '停辦/整併'
  return '正式註記'
}

export function buildInvestigationItems({
  summaryDataset,
  countySummaries,
  countyRankingRows,
  selectedCounty,
  selectedCountyDetail,
  selectedTownshipId,
  selectedTownshipSummary,
  scopeNotes,
  filters,
}: {
  summaryDataset: EducationSummaryDataset
  countySummaries: CountySummary[]
  countyRankingRows: ReturnType<typeof getCountyRankingRows>
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
        title: `${selectedTownshipSummary.label} / ${note.type}`,
        detail: note.message,
        meta: note.years?.length ? `涉及年度: ${note.years.join('、')}` : selectedCounty.name,
        severity: note.severity,
        seriesRows,
        downloadName: `${selectedTownshipSummary.label}-${note.type}-原始序列.csv`,
      })
      return
    }

    if (selectedCounty) {
      register({
        id: `scope-county-${selectedCounty.name}-${note.type}-${index}`,
        scope: '縣市',
        title: `${selectedCounty.name} / ${note.type}`,
        detail: note.message,
        meta: note.years?.length ? `涉及年度: ${note.years.join('、')}` : selectedCounty.region,
        severity: note.severity,
        seriesRows: buildSummarySeriesRows(resolveSummarySeries(selectedCounty.summaries, filters.educationLevel, filters.managementType)),
        downloadName: `${selectedCounty.name}-${note.type}-原始序列.csv`,
      })
    }
  })

  if (!selectedCounty) {
    countyRankingRows.slice(0, 4).forEach((row) => {
      const county = summaryDataset.counties.find((entry) => entry.id === row.id)
      const countySummary = countySummaries.find((entry) => entry.id === row.id)
      county?.dataNotes?.forEach((note, index) => {
        register({
          id: `county-${county.id}-${note.type}-${index}`,
          scope: '縣市',
          title: `${county.name} / ${note.type}`,
          detail: note.message,
          meta: `${county.region} | ${formatStudents(countySummary?.students ?? row.students)} 人`,
          severity: note.severity,
          seriesRows: buildSummarySeriesRows(resolveSummarySeries(county.summaries, filters.educationLevel, filters.managementType)),
          downloadName: `${county.name}-${note.type}-原始序列.csv`,
        })
      })
    })
  }

  selectedCountyDetail?.towns.forEach((township) => {
    const townshipSummaryRecord = selectedCounty?.towns.find((item) => item.id === township.id)
    const townshipSeriesRows = townshipSummaryRecord
      ? buildSummarySeriesRows(resolveSummarySeries(townshipSummaryRecord.summaries, filters.educationLevel, filters.managementType))
      : []

    township.dataNotes?.forEach((note, index) => {
      register({
        id: `town-${township.id}-${note.type}-${index}`,
        scope: '鄉鎮',
        title: `${township.name} / ${note.type}`,
        detail: note.message,
        meta: selectedCountyDetail.county.name,
        severity: note.severity,
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
          title: `${school.name} / ${school.status}`,
          detail: school.status === '待確認' ? '此校狀態仍待人工確認。' : '此校在正式資料中被標記為非一般持續營運狀態。',
          meta: `${township.name} | ${school.educationLevel}`,
          severity: school.status === '待確認' ? 'critical' : 'warning',
          seriesRows: schoolSeriesRows,
          downloadName: `${school.name}-${school.status}-原始序列.csv`,
        })
      }

      if (school.missingYears && school.missingYears.length > 0) {
        register({
          id: `missing-${school.id}`,
          scope: '學校',
          title: `${school.name} / 缺年度`,
          detail: `缺少 ${school.missingYears.map((year) => formatAcademicYear(year)).join('、')} 的正式學生數紀錄。`,
          meta: `${township.name} | ${school.educationLevel}`,
          severity: 'warning',
          seriesRows: schoolSeriesRows,
          downloadName: `${school.name}-缺年度-原始序列.csv`,
        })
      }

      school.dataNotes?.forEach((note, index) => {
        register({
          id: `school-note-${school.id}-${note.type}-${index}`,
          scope: '學校',
          title: `${school.name} / ${note.type}`,
          detail: note.message,
          meta: `${township.name} | ${school.educationLevel}`,
          severity: note.severity,
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
