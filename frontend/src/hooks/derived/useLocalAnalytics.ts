import { useMemo } from 'react'
import type { 
  EducationSummaryDataset, 
  AcademicYear,
  EducationLevelFilter,
  ManagementTypeFilter,
  RegionGroupFilter,
  CountySummaryRecord
} from '../../data/educationData'
import {
  getCountyScopeSummaryFromSummary,
  getTownshipScopeSummaryFromSummary,
  getTownshipSummaries,
} from '../../lib/analytics'

type AnalyticsFilters = {
  year: AcademicYear
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  region: RegionGroupFilter
  searchText: string
}

/**
 * Atom Hook: Computes specific county and township level metrics.
 */
export function useLocalAnalytics({
  summaryDataset,
  filters,
  selectedCounty,
  activeTownshipId,
}: {
  summaryDataset: EducationSummaryDataset | null
  filters: AnalyticsFilters
  selectedCounty: CountySummaryRecord | null
  activeTownshipId: string | null
}) {
  return useMemo(() => {
    if (!summaryDataset) return {
      selectedCountySummary: null,
      townshipRows: [],
      allTownshipRows: [],
      selectedTownshipSummary: null,
    }

    const selectedCountySummary = selectedCounty ? getCountyScopeSummaryFromSummary(selectedCounty, filters) : null
    const townshipRows = selectedCounty ? getTownshipSummaries(selectedCounty, filters) : []
    const allTownshipRows = summaryDataset.counties.flatMap((county) => getTownshipSummaries(county, filters))
    
    const selectedTownshipSummary = selectedCounty && activeTownshipId
      ? getTownshipScopeSummaryFromSummary(selectedCounty, activeTownshipId, filters)
      : null

    return {
      selectedCountySummary,
      townshipRows,
      allTownshipRows,
      selectedTownshipSummary,
    }
  }, [summaryDataset, filters, selectedCounty, activeTownshipId])
}
