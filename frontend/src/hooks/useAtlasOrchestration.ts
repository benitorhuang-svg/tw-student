import type { Dispatch, SetStateAction, TransitionStartFunction } from 'react'
import { useEffect, useRef } from 'react'

import type { AcademicYear, EducationLevelFilter, ManagementTypeFilter, RegionGroupFilter } from '../data/educationData'
import type { useEducationData } from './useEducationData'
import type { AtlasLoadObservationSnapshot, InvestigationFilter, SavedComparisonScenario } from './types'
import type { AtlasTab } from './useAtlasQueryState'
import type { useFeedbackMessage } from './useFeedbackMessage'
import { createSavedComparisonScenario } from './atlasHelpers'
import { normalizeCountyId, normalizeCountyIds, normalizeTownshipId } from './atlasIdentity'
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
    forceTownshipLabels,
  } = input

  const { summaryDataset, countyDetailCache, countyBucketCache, townshipBoundaryCache, countyDetailError, clearCountyDetailError } = educationData

  useEffect(() => {
    if (!summaryDataset) return

    const normalizedCountyId = normalizeCountyId(summaryDataset, selectedCountyId)
    const normalizedTownshipId = normalizedCountyId ? normalizeTownshipId(summaryDataset, normalizedCountyId, selectedTownshipId) : null
    const normalizedComparisonIds = normalizeCountyIds(summaryDataset, comparisonCountyIds).slice(0, 4)
    const comparisonIdsChanged = normalizedComparisonIds.length !== comparisonCountyIds.length || normalizedComparisonIds.some((countyId, index) => countyId !== comparisonCountyIds[index])

    if (selectedCountyId !== normalizedCountyId) {
      setSelectedCountyId(normalizedCountyId)
    }
    if (selectedTownshipId !== normalizedTownshipId) {
      setSelectedTownshipId(normalizedTownshipId)
    }
    if (comparisonIdsChanged) {
      setComparisonCountyIds(normalizedComparisonIds)
    }
  }, [comparisonCountyIds, selectedCountyId, selectedTownshipId, setComparisonCountyIds, setSelectedCountyId, setSelectedTownshipId, summaryDataset])

  useAtlasUrlSync({
    summaryDataset, activeTab, activeYear, educationLevel, managementType, region,
    deferredSearchText, comparisonCountyIds, comparisonScenarioName,
    selectedCountyId, selectedTownshipId, selectedSchoolId,
    mapZoom: input.mapZoom, mapLat: input.mapLat, mapLon: input.mapLon,
    forceTownshipLabels,
  })

  // If a school is already selected, only auto-switch to school-focus when
  // the user is already in a non-overview context.
  // No auto-redirect logic here anymore to allow manual tab switching

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

  // ── UI Flow Logic: Selection Hierarchy Completion ──
  // Hierarchy completion is now handled atomically within handleSchoolSelect 
  // and handleSearch in scenarioActions to ensure UI consistency.

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
    setSelectedSchoolId, setMapResetToken, setActiveTab, clearCountyDetailError,
    startTransition, copyFeedback, scenarioFeedback,
  })

  // ── School code & Name auto-navigation (GMap Search Logic) ──
  const lastCodeNavRef = useRef<string>('')
  useEffect(() => {
    const query = deferredSearchText.trim()
    if (query.length < 2 || query === lastCodeNavRef.current) return
    
    lastCodeNavRef.current = query
    const index = summaryDataset?.schoolCodeIndex
    if (!index) return

    startTransition(() => {
      // 1. Try numeric code match first (High precision)
      if (/^\d{4,}$/.test(query)) {
        const entry = index[query]
        if (entry) {
          const nextCountyId = entry.countyId ?? entry.countyCode ?? null
          const nextTownshipId = entry.townshipId ?? entry.townCode ?? null
          setSelectedCountyId(nextCountyId)
          setRegion('全部')
          setSelectedTownshipId(nextTownshipId)
          setSelectedSchoolId(entry.schoolIds?.[0] ?? query)
          setActiveTab('school-focus', 0)
          return
        }
      }

      // 2. Try fuzzy name match (Discoverability)
      // We look for partial matches in the school index if the query looks like a name
      if (query.length >= 2 && !/^\d+$/.test(query)) {
        const matches = Object.values(index).filter(entry => 
          entry.name?.includes(query) || (entry.schoolIds?.[0]?.includes(query))
        )
        
        if (matches.length === 1) {
          const entry = matches[0]
          const nextCountyId = entry.countyId ?? entry.countyCode ?? null
          const nextTownshipId = entry.townshipId ?? entry.townCode ?? null
          setSelectedCountyId(nextCountyId)
          setRegion('全部')
          setSelectedTownshipId(nextTownshipId)
          setSelectedSchoolId(entry.schoolIds?.[0] ?? query)
          setActiveTab('school-focus', 0)
        }
        // Note: If multiple matches, we let the derived state handle the list display
      }
    })
  }, [deferredSearchText, summaryDataset, startTransition, setSelectedCountyId, setSelectedTownshipId, setSelectedSchoolId, setRegion])

  return { derived, scenarioActions, activeScenarioSnapshot }
}
