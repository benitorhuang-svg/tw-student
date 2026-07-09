import { useMemo } from 'react'
import type { 
  EducationSummaryDataset, 
  CountySummaryRecord,
  AcademicYear,
  EducationLevelFilter,
  ManagementTypeFilter,
  RegionGroupFilter
} from '@/shared/api/data/educationData'
import { useCountyAnalytics } from '@/domains/county'
import { useNationalAnalytics } from '@/domains/national'
import { useTownshipAnalytics } from '@/domains/township'

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

  const regional = useTownshipAnalytics({
    summaryDataset,
    filters,
    comparisonCountyIds,
    comparisonScenarioName
  })

  const local = useCountyAnalytics({
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
