import { useMemo } from 'react'
import type { 
  EducationSummaryDataset, 
  CountySummaryRecord,
  AcademicYear,
  EducationLevelFilter,
  ManagementTypeFilter,
  RegionGroupFilter
} from '../../data/educationData'
import { useNationalAnalytics } from './useNationalAnalytics'
import { useRegionalAnalytics } from './useRegionalAnalytics'
import { useLocalAnalytics } from './useLocalAnalytics'

export function useAnalyticsState(
  summaryDataset: EducationSummaryDataset | null,
  filters: {
    year: AcademicYear
    educationLevel: EducationLevelFilter
    managementType: ManagementTypeFilter
    region: RegionGroupFilter
    searchText: string
  },
  selectedCounty: CountySummaryRecord | null,
  activeTownshipId: string | null,
  comparisonCountyIds: string[],
  comparisonScenarioName: string,
) {
  const national = useNationalAnalytics(summaryDataset, filters)

  const regional = useRegionalAnalytics({
    summaryDataset,
    filters,
    comparisonCountyIds,
    comparisonScenarioName
  })

  const local = useLocalAnalytics({
    summaryDataset,
    filters,
    selectedCounty,
    activeTownshipId
  })

  return useMemo(() => ({
    ...national,
    ...regional,
    ...local,
  }), [national, regional, local])
}
