import type { Dispatch, SetStateAction, TransitionStartFunction } from 'react'

import type { AcademicYear, EducationLevelFilter, ManagementTypeFilter, RegionGroupFilter } from '../data/educationData'
import type { useEducationData } from './useEducationData'
import type { AtlasLoadObservationSnapshot, InvestigationFilter, SavedComparisonScenario } from './types'
import type { AtlasTab } from './useAtlasQueryState'
import type { useFeedbackMessage } from './useFeedbackMessage'
import { createSavedComparisonScenario } from './atlasHelpers'
import { useAtlasDerivedState } from './useAtlasDerivedState'
import { useAtlasScenarioActions } from './useAtlasScenarioActions'
import { useAtlasTopPrefetch } from './useAtlasTopPrefetch'
import { useAtlasUrlSync } from './useAtlasUrlSync'
import { useAtlasNormalization } from './useAtlasNormalization'
import { useAtlasSearchNavigation } from './useAtlasSearchNavigation'
import {
  COMPARISON_FAVORITES_STORAGE_KEY,
  COMPARISON_RECENTS_STORAGE_KEY,
} from '../lib/constants'

type OrchestrationInput = {
  // State
  activeTab: AtlasTab
  activeYear: AcademicYear
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  region: RegionGroupFilter
  deferredSearchText: string
  selectedCountyId: string | null
  selectedTownshipId: string | null
  selectedSchoolId: string | null
  comparisonCountyIds: string[]
  comparisonScenarioName: string
  favoriteScenarios: SavedComparisonScenario[]
  investigationFilter: InvestigationFilter
  selectedInvestigationId: string | null
  mapZoom: number | null
  mapLat: number | null
  mapLon: number | null
  tabIsExplicitFromQuery: boolean
  forceTownshipLabels: boolean

  // Setters
  setFavoriteScenarios: Dispatch<SetStateAction<SavedComparisonScenario[]>>
  setRecentScenarios: Dispatch<SetStateAction<SavedComparisonScenario[]>>
  setComparisonCountyIds: Dispatch<SetStateAction<string[]>>
  setComparisonScenarioName: Dispatch<SetStateAction<string>>
  setActiveYear: Dispatch<SetStateAction<AcademicYear>>
  setEducationLevel: Dispatch<SetStateAction<EducationLevelFilter>>
  setManagementType: Dispatch<SetStateAction<ManagementTypeFilter>>
  setRegion: Dispatch<SetStateAction<RegionGroupFilter>>
  setSelectedCountyId: Dispatch<SetStateAction<string | null>>
  setSelectedTownshipId: Dispatch<SetStateAction<string | null>>
  setSelectedSchoolId: Dispatch<SetStateAction<string | null>>
  setMapResetToken: Dispatch<SetStateAction<number>>
  setActiveTab: (tab: AtlasTab, scrollDelay?: number) => void
  setMapZoom: Dispatch<SetStateAction<number | null>>
  setMapLat: Dispatch<SetStateAction<number | null>>
  setMapLon: Dispatch<SetStateAction<number | null>>
  startTransition: TransitionStartFunction
  copyFeedback: ReturnType<typeof useFeedbackMessage>
  scenarioFeedback: ReturnType<typeof useFeedbackMessage>

  // Data hooks
  educationData: ReturnType<typeof useEducationData>
  loadObservation: AtlasLoadObservationSnapshot
}

/**
 * Organism Hook: Orchestrates the entire Atlas life-cycle.
 * Composes specialized atom hooks for normalization, synchronization, prefetching, and navigation.
 */
export function useAtlasOrchestration(input: OrchestrationInput) {
  const {
    activeTab, activeYear, educationLevel, managementType, region,
    deferredSearchText, selectedCountyId, selectedTownshipId, selectedSchoolId,
    comparisonCountyIds, comparisonScenarioName, favoriteScenarios,
    investigationFilter, selectedInvestigationId,
    setFavoriteScenarios, setRecentScenarios, setComparisonCountyIds, setComparisonScenarioName,
    setActiveYear, setEducationLevel, setManagementType, setRegion,
    setSelectedCountyId, setSelectedTownshipId, setSelectedSchoolId,
    setMapResetToken, setActiveTab, setMapZoom, setMapLat, setMapLon, startTransition, copyFeedback, scenarioFeedback,
    educationData, loadObservation,
    forceTownshipLabels,
  } = input

  const { 
    summaryDataset, 
    countyDetailCache, 
    countyBucketCache, 
    townshipBoundaryCache, 
    countyDetailError, 
    clearCountyDetailError 
  } = educationData

  // 1. Data Integrity Layer
  useAtlasNormalization({
    summaryDataset,
    selectedCountyId,
    selectedTownshipId,
    comparisonCountyIds,
    setSelectedCountyId,
    setSelectedTownshipId,
    setComparisonCountyIds,
  })

  // 2. State to URL Sync Layer (Atoms)
  useAtlasUrlSync({
    summaryDataset, activeTab, activeYear, educationLevel, managementType, region,
    deferredSearchText, comparisonCountyIds, comparisonScenarioName,
    selectedCountyId, selectedTownshipId, selectedSchoolId,
    mapZoom: input.mapZoom, mapLat: input.mapLat, mapLon: input.mapLon,
    forceTownshipLabels,
  })

  // 3. Automated Navigation Layer (Molecule)
  useAtlasSearchNavigation({
    summaryDataset,
    deferredSearchText,
    startTransition,
    setSelectedCountyId,
    setRegion,
    setSelectedTownshipId,
    setSelectedSchoolId,
    setMapLat,
    setMapLon,
    setMapZoom,
    setActiveTab,
  })

  // 4. Optimization Layer (Prefetching)
  useAtlasTopPrefetch({
    summaryDataset, selectedCountyId, activeYear, educationLevel,
    managementType, region, deferredSearchText,
  })

  // 5. Computation Layer (Derived State)
  const derived = useAtlasDerivedState({
    summaryDataset, activeYear, educationLevel, managementType, region,
    deferredSearchText, selectedCountyId, selectedTownshipId, selectedSchoolId,
    comparisonCountyIds, comparisonScenarioName,
    countyDetailCache, countyBucketCache, townshipBoundaryCache,
    countyDetailError, loadObservation, investigationFilter, selectedInvestigationId,
  })

  const activeScenarioSnapshot = derived.activeScenarioSnapshot
    ? createSavedComparisonScenario(derived.activeScenarioSnapshot)
    : null

  // 6. Interaction Layer (Scenarios & CRUD)
  const scenarioActions = useAtlasScenarioActions({
    summaryDataset, activeYear, educationLevel, managementType, region,
    selectedCountyId, selectedTownshipId, selectedSchoolId, comparisonCountyIds, comparisonScenarioName,
    favoriteScenarios,
    activeScenarioSnapshot: derived.activeScenarioSnapshot,
    filteredAnomalies: derived.filteredAnomalies,
    scopeHeadline: derived.scopeHeadline,
    favoritesStorageKey: COMPARISON_FAVORITES_STORAGE_KEY,
    recentsStorageKey: COMPARISON_RECENTS_STORAGE_KEY,
    setFavoriteScenarios, setRecentScenarios, setComparisonCountyIds,
    setComparisonScenarioName, setActiveYear, setEducationLevel,
    setManagementType, setRegion, setSelectedCountyId, setSelectedTownshipId,
    setSelectedSchoolId, setMapResetToken, setActiveTab, setMapZoom, setMapLat, setMapLon, clearCountyDetailError,
    startTransition, copyFeedback, scenarioFeedback,
  })

  return { derived, scenarioActions, activeScenarioSnapshot }
}
