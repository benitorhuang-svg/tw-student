import { useEffect } from 'react'

import type {
  AcademicYear,
  EducationLevelFilter,
  EducationSummaryDataset,
  ManagementTypeFilter,
  RegionGroupFilter,
} from '../data/educationData'
import { toCanonicalCountyId, toCanonicalCountyIds, toCanonicalTownshipId } from './atlasIdentity'
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
  selectedSchoolId: string | null
  mapZoom: number | null
  mapLat: number | null
  mapLon: number | null
  forceTownshipLabels: boolean
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
  selectedSchoolId,
  mapZoom,
  mapLat,
  mapLon,
  forceTownshipLabels,
}: UseAtlasUrlSyncArgs) {
  useEffect(() => {
    if (!summaryDataset) return

    // Preserve any query params we don't explicitly manage (e.g. vectorTiles).
    const params = new URLSearchParams(window.location.search)

    params.set('year', String(summaryDataset.years.includes(activeYear) ? activeYear : summaryDataset.years.at(-1) ?? activeYear))

    if (educationLevel !== '全部') params.set('level', educationLevel)
    else params.delete('level')

    if (managementType !== '全部') params.set('management', managementType)
    else params.delete('management')

    if (deferredSearchText.trim()) params.set('search', deferredSearchText.trim())
    else params.delete('search')

    const cleanedComparisonIds = toCanonicalCountyIds(summaryDataset, comparisonCountyIds)
    if (cleanedComparisonIds.length > 0) params.set('compare', cleanedComparisonIds.join(','))
    else params.delete('compare')

    if (comparisonScenarioName.trim()) params.set('scenario', comparisonScenarioName.trim())
    else params.delete('scenario')

    if (region !== '全部') params.set('region', region)
    else params.delete('region')

    if (selectedSchoolId) params.set('school', selectedSchoolId)
    else params.delete('school')

    const countyIdForUrl = toCanonicalCountyId(summaryDataset, selectedCountyId)
    if (countyIdForUrl) params.set('county', countyIdForUrl)
    else params.delete('county')

    const townshipIdForUrl = countyIdForUrl ? toCanonicalTownshipId(summaryDataset, selectedCountyId, selectedTownshipId) : null
    if (townshipIdForUrl) params.set('township', townshipIdForUrl)
    else params.delete('township')

    if (activeTab !== 'overview') params.set('tab', activeTab)
    else params.delete('tab')

    if (mapZoom != null && Number.isFinite(mapZoom)) params.set('zoom', String(Math.round(mapZoom)))
    else params.delete('zoom')

    if (forceTownshipLabels) params.set('forceTownshipLabels', 'true')
    else params.delete('forceTownshipLabels')

    if (mapLat != null && mapLon != null && Number.isFinite(mapLat) && Number.isFinite(mapLon)) {
      params.set('lat', mapLat.toFixed(5))
      params.set('lon', mapLon.toFixed(5))
    } else {
      params.delete('lat')
      params.delete('lon')
    }

    const nextSearch = params.toString()
    const nextUrl = nextSearch ? `${window.location.pathname}?${nextSearch}` : window.location.pathname
    
    // Only update if the URL actually changed to prevent history bloat
    if (window.location.search.substring(1) !== nextSearch) {
      window.history.replaceState({}, '', nextUrl)
    }
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
    selectedSchoolId,
    mapZoom,
    forceTownshipLabels,
    mapLat,
    mapLon,
    summaryDataset,
  ])
}