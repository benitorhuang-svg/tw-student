import { useMemo } from 'react'
import type { 
  EducationSummaryDataset, 
  CountySummaryRecord,
  CountyDetailDataset,
  EducationLevelFilter,
  ManagementTypeFilter,
} from '../../data/educationData'
import { buildInvestigationItems, classifyInvestigation } from '../buildInvestigationItems'
import type { InvestigationFilter } from '../types'

export function useInvestigationState(
  summaryDataset: EducationSummaryDataset | null,
  countySummaries: any[],
  countyRankingRows: any[],
  selectedCounty: CountySummaryRecord | null,
  selectedCountyDetail: CountyDetailDataset | null,
  activeTownshipId: string | null,
  selectedTownshipSummary: any,
  scopeNotes: any[],
  educationLevel: EducationLevelFilter,
  managementType: ManagementTypeFilter,
  investigationFilter: InvestigationFilter,
  selectedInvestigationId: string | null,
) {
  return useMemo(() => {
    if (!summaryDataset) return { filteredAnomalies: [], activeInvestigation: null }

    const anomalies = buildInvestigationItems({
      summaryDataset,
      countySummaries,
      countyRankingRows,
      selectedCounty,
      selectedCountyDetail,
      selectedTownshipId: activeTownshipId,
      selectedTownshipSummary,
      scopeNotes,
      filters: { educationLevel, managementType },
    })

    const filteredAnomalies = anomalies.filter((item) => 
      investigationFilter === '全部' || classifyInvestigation(item) === investigationFilter
    )
    
    const activeInvestigation = filteredAnomalies.find((item) => item.id === selectedInvestigationId) ?? filteredAnomalies[0] ?? null

    return {
      filteredAnomalies,
      activeInvestigation,
    }
  }, [
    summaryDataset, countySummaries, countyRankingRows, selectedCounty, 
    selectedCountyDetail, activeTownshipId, selectedTownshipSummary, 
    scopeNotes, educationLevel, managementType, investigationFilter, selectedInvestigationId
  ])
}
