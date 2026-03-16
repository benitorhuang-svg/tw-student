import { readInitialQueryState } from './useAtlasQueryState'
import { useFilterAppState } from './useFilterAppState'
import { useNavigationAppState } from './useNavigationAppState'
import { useComparisonAppState } from './useComparisonAppState'
import { useInteractionAppState } from './useInteractionAppState'

/**
 * Organism Hook: Root State container.
 * Composes specialized atom hooks into a unified state object.
 */
export function useAtlasAppState() {
  const initial = readInitialQueryState()

  const filters = useFilterAppState({
    activeYear: initial.activeYear,
    educationLevel: initial.educationLevel,
    managementType: initial.managementType,
    region: initial.region,
    searchText: initial.searchText,
  })

  const nav = useNavigationAppState({
    selectedCountyId: initial.selectedCountyId,
    selectedTownshipId: initial.selectedTownshipId,
    selectedSchoolId: initial.selectedSchoolId,
    tab: initial.tab,
    zoom: initial.zoom ?? null,
    lat: initial.lat ?? null,
    lon: initial.lon ?? null,
    tabIsExplicit: initial.tabIsExplicit,
    forceTownshipLabels: initial.forceTownshipLabels ?? false,
  })

  const comparison = useComparisonAppState({
    comparisonCountyIds: initial.comparisonCountyIds,
    comparisonScenarioName: initial.comparisonScenarioName,
  })

  const interaction = useInteractionAppState()

  return {
    initialQueryState: initial,
    ...filters,
    ...nav,
    ...comparison,
    ...interaction,
  }
}
