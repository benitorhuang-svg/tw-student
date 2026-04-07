import { useEffect } from 'react'

import {
  prefetchCountyResources,
  type AcademicYear,
  type EducationLevelFilter,
  type EducationSummaryDataset,
  type ManagementTypeFilter,
  type RegionGroupFilter,
} from '../data/educationData'
import { getCountyRankingRows, getCountySummaries } from '../lib/analytics'

type UseAtlasTopPrefetchArgs = {
  summaryDataset: EducationSummaryDataset | null
  selectedCountyId: string | null
  activeYear: AcademicYear
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  region: RegionGroupFilter
  deferredSearchText: string
}

export function useAtlasTopPrefetch({
  summaryDataset,
  selectedCountyId,
  activeYear,
  educationLevel,
  managementType,
  region,
  deferredSearchText,
}: UseAtlasTopPrefetchArgs) {
  useEffect(() => {
    if (!summaryDataset || selectedCountyId) return

    const prefetchFilters = {
      year: summaryDataset.years.includes(activeYear) ? activeYear : (summaryDataset.years.at(-1) ?? activeYear),
      educationLevel,
      managementType,
      region,
      searchText: deferredSearchText,
    }

    const topCounties = getCountyRankingRows(getCountySummaries(summaryDataset.counties, prefetchFilters)).slice(0, 3)
    topCounties
      .map((row) => summaryDataset.counties.find((county) => county.id === row.id))
      .filter((county): county is NonNullable<typeof county> => Boolean(county))
      .forEach((county) => {
        void prefetchCountyResources(county, { includeTownshipSlice: true, includeBucketSlice: true })
      })
  }, [activeYear, deferredSearchText, educationLevel, managementType, region, selectedCountyId, summaryDataset])
}