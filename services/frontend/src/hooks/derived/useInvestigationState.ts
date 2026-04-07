import { useMemo } from 'react'
import type { 
  EducationSummaryDataset, 
  CountySummaryRecord,
  CountyDetailDataset,
  EducationLevelFilter,
  ManagementTypeFilter,
  DataNote,
} from '../../data/educationData'
import { buildInvestigationItems, classifyInvestigation } from '../buildInvestigationItems'
import type { InvestigationFilter } from '../types'
import type { CountySummary, ScopeSummary } from '../../lib/analytics'

export function useInvestigationState(
  summaryDataset: EducationSummaryDataset | null,
  countySummaries: CountySummary[],
  selectedCounty: CountySummaryRecord | null,
  selectedCountyDetail: CountyDetailDataset | null,
  activeTownshipId: string | null,
  selectedTownshipSummary: ScopeSummary | null,
  scopeNotes: DataNote[],
  educationLevel: EducationLevelFilter,
  managementType: ManagementTypeFilter,
  investigationFilter: InvestigationFilter,
  selectedInvestigationId: string | null,
) {
  return useMemo(() => {
    if (!summaryDataset) {
      return {
        filteredAnomalies: [],
        activeInvestigation: null,
        anomaliesCounts: { '全部': 0, '缺年度': 0, '待確認': 0, '停辦/整併': 0, '正式註記': 0 },
      }
    }

    const investigationItems = buildInvestigationItems({
      summaryDataset,
      countySummaries,
      selectedCounty,
      selectedCountyDetail,
      selectedTownshipId: activeTownshipId,
      selectedTownshipSummary,
      scopeNotes,
      filters: { educationLevel, managementType },
    })

    const anomalies = investigationItems.filter((item) => item.actionable)

    const counts: Record<InvestigationFilter, number> = {
      '全部': anomalies.length,
      '缺年度': anomalies.filter((item) => classifyInvestigation(item) === '缺年度').length,
      '待確認': anomalies.filter((item) => classifyInvestigation(item) === '待確認').length,
      '停辦/整併': anomalies.filter((item) => classifyInvestigation(item) === '停辦/整併').length,
      '正式註記': 0,
    }

    const filteredAnomalies = anomalies.filter((item) => 
      investigationFilter === '全部' || classifyInvestigation(item) === investigationFilter
    )
    
    const activeInvestigation = filteredAnomalies.find((item) => item.id === selectedInvestigationId) ?? filteredAnomalies[0] ?? null

    return {
      filteredAnomalies,
      activeInvestigation,
      anomaliesCounts: counts,
    }
  }, [
    summaryDataset, countySummaries, selectedCounty, 
    selectedCountyDetail, activeTownshipId, selectedTownshipSummary, 
    scopeNotes, educationLevel, managementType, investigationFilter, selectedInvestigationId
  ])
}
