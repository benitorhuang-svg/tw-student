import { useEffect } from 'react'

import type {
  AcademicYear,
  EducationLevelFilter,
  EducationSummaryDataset,
  ManagementTypeFilter,
  RegionGroupFilter,
} from '../data/educationData'
import type { AtlasTab } from './useAtlasQueryState'

type UseAtlasUrlSyncArgs = {
  summaryDataset: EducationSummaryDataset | null
  activeTab: AtlasTab
  activeYear: AcademicYear
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  region: RegionGroupFilter
  deferredSearchText: string
  comparisonCountyIds: string[]
  comparisonScenarioName: string
  selectedCountyId: string | null
  selectedTownshipId: string | null
}

export function useAtlasUrlSync({
  summaryDataset,
  activeTab,
  activeYear,
  educationLevel,
  managementType,
  region,
  deferredSearchText,
  comparisonCountyIds,
  comparisonScenarioName,
  selectedCountyId,
  selectedTownshipId,
}: UseAtlasUrlSyncArgs) {
  useEffect(() => {
    if (!summaryDataset) return

    const params = new URLSearchParams()
    params.set('year', String(summaryDataset.years.includes(activeYear) ? activeYear : summaryDataset.years.at(-1) ?? activeYear))

    if (educationLevel !== '全部') params.set('level', educationLevel)
    if (managementType !== '全部') params.set('management', managementType)
    if (region !== '全部') params.set('region', region)
    if (deferredSearchText.trim()) params.set('search', deferredSearchText.trim())

    const cleanedComparisonIds = comparisonCountyIds.filter((countyId) => summaryDataset.counties.some((county) => county.id === countyId))
    if (cleanedComparisonIds.length > 0) params.set('compare', cleanedComparisonIds.join(','))
    if (comparisonScenarioName.trim()) params.set('scenario', comparisonScenarioName.trim())

    const countyIdForUrl = summaryDataset.counties.some((county) => county.id === selectedCountyId) ? selectedCountyId : null
    if (countyIdForUrl) params.set('county', countyIdForUrl)

    const townshipIdForUrl = countyIdForUrl
      ? summaryDataset.counties.find((county) => county.id === countyIdForUrl)?.towns.some((town) => town.id === selectedTownshipId) ? selectedTownshipId : null
      : null
    if (townshipIdForUrl) params.set('township', townshipIdForUrl)

    if (activeTab !== 'overview') params.set('tab', activeTab)

    const nextSearch = params.toString()
    const nextUrl = nextSearch ? `${window.location.pathname}?${nextSearch}` : window.location.pathname
    window.history.replaceState({}, '', nextUrl)
  }, [
    activeTab,
    activeYear,
    comparisonCountyIds,
    comparisonScenarioName,
    deferredSearchText,
    educationLevel,
    managementType,
    region,
    selectedCountyId,
    selectedTownshipId,
    summaryDataset,
  ])
}