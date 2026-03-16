import { useMemo } from 'react'
import type { 
  EducationSummaryDataset, 
  AcademicYear,
  EducationLevelFilter,
  ManagementTypeFilter,
  RegionGroupFilter
} from '../../data/educationData'
import {
  getNationalEducationDistribution,
  getNationalEducationTrendSeries,
  getNationSummary,
} from '../../lib/analytics'

type AnalyticsFilters = {
  year: AcademicYear
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  region: RegionGroupFilter
  searchText: string
}

/**
 * Atom Hook: Computes national-level statistics and distributions.
 */
export function useNationalAnalytics(
  summaryDataset: EducationSummaryDataset | null,
  filters: AnalyticsFilters
) {
  return useMemo(() => {
    if (!summaryDataset) return {
      nationalSummary: null,
      educationDistribution: [],
      nationalEducationTrendSeries: [],
    }

    const nationalSummary = getNationSummary(summaryDataset.counties, filters)
    const educationDistribution = getNationalEducationDistribution(summaryDataset.counties, filters)
    const nationalEducationTrendSeries = getNationalEducationTrendSeries(summaryDataset.counties, filters)

    return {
      nationalSummary,
      educationDistribution,
      nationalEducationTrendSeries,
    }
  }, [summaryDataset, filters])
}
