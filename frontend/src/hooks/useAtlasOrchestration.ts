import type { Dispatch, SetStateAction, TransitionStartFunction } from 'react'
import { useEffect, useRef } from 'react'

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
  startTransition: TransitionStartFunction
  copyFeedback: ReturnType<typeof useFeedbackMessage>
  scenarioFeedback: ReturnType<typeof useFeedbackMessage>

  // Data hooks
  educationData: ReturnType<typeof useEducationData>
  loadObservation: AtlasLoadObservationSnapshot
}

export function useAtlasOrchestration(input: OrchestrationInput) {
  const {
    activeTab, activeYear, educationLevel, managementType, region,
    deferredSearchText, selectedCountyId, selectedTownshipId, selectedSchoolId,
    comparisonCountyIds, comparisonScenarioName, favoriteScenarios,
    investigationFilter, selectedInvestigationId,
    setFavoriteScenarios, setRecentScenarios, setComparisonCountyIds, setComparisonScenarioName,
    setActiveYear, setEducationLevel, setManagementType, setRegion,
    setSelectedCountyId, setSelectedTownshipId, setSelectedSchoolId,
    setMapResetToken, setActiveTab, startTransition, copyFeedback, scenarioFeedback,
    educationData, loadObservation,
  } = input

  const { summaryDataset, countyDetailCache, countyBucketCache, townshipBoundaryCache, countyDetailError, clearCountyDetailError } = educationData

  useAtlasUrlSync({
    summaryDataset, activeTab, activeYear, educationLevel, managementType,
    deferredSearchText, comparisonCountyIds, comparisonScenarioName,
    selectedCountyId, selectedTownshipId, mapZoom: input.mapZoom,
    mapLat: input.mapLat, mapLon: input.mapLon,
  })

  useAtlasTopPrefetch({
    summaryDataset, selectedCountyId, activeYear, educationLevel,
    managementType, region, deferredSearchText,
  })

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

  const scenarioActions = useAtlasScenarioActions({
    summaryDataset, activeYear, educationLevel, managementType, region,
    selectedCountyId, selectedTownshipId, comparisonCountyIds, comparisonScenarioName,
    favoriteScenarios,
    activeScenarioSnapshot: derived.activeScenarioSnapshot,
    filteredAnomalies: derived.filteredAnomalies,
    scopeHeadline: derived.scopeHeadline,
    favoritesStorageKey: COMPARISON_FAVORITES_STORAGE_KEY,
    recentsStorageKey: COMPARISON_RECENTS_STORAGE_KEY,
    setFavoriteScenarios, setRecentScenarios, setComparisonCountyIds,
    setComparisonScenarioName, setActiveYear, setEducationLevel,
    setManagementType, setRegion, setSelectedCountyId, setSelectedTownshipId,
    setSelectedSchoolId, setMapResetToken, setActiveTab, clearCountyDetailError,
    startTransition, copyFeedback, scenarioFeedback,
  })

  // ── School code auto-navigation ──
  const lastCodeNavRef = useRef<string>('')
  useEffect(() => {
    const code = deferredSearchText.trim()
    if (!/^\d{4,}$/.test(code)) {
      lastCodeNavRef.current = ''
      return
    }
    if (code === lastCodeNavRef.current) return
    const index = summaryDataset?.schoolCodeIndex
    if (!index) return
    const entry = index[code]
    if (!entry) return
    lastCodeNavRef.current = code
    startTransition(() => {
      if (selectedCountyId !== entry.countyId) {
        setSelectedCountyId(entry.countyId)
      }
      setRegion('全部')
      setSelectedTownshipId(null)
      setSelectedSchoolId(code)
    })
    setActiveTab('school-focus', 0)
  }, [deferredSearchText, summaryDataset, selectedCountyId, startTransition, setSelectedCountyId, setSelectedTownshipId, setSelectedSchoolId, setRegion, setActiveTab])

  return { derived, scenarioActions, activeScenarioSnapshot }
}
