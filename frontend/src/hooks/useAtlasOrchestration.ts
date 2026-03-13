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
    tabIsExplicitFromQuery, forceTownshipLabels,
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
  // This preserves `tab=overview` even when `school=` is present in the URL.
  const tabExplicitRef = useRef(tabIsExplicitFromQuery)
  useEffect(() => {
    // Clear the explicit tab flag after first mount so subsequent user interactions
    // can still auto-switch tabs.
    if (tabExplicitRef.current) {
      tabExplicitRef.current = false
      return
    }

    if (selectedSchoolId && activeTab !== 'overview') {
      setActiveTab('school-focus', 0)
    }
  }, [selectedSchoolId, activeTab, setActiveTab])

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
      const nextCountyId = entry.countyId ?? entry.countyCode ?? null
      if (selectedCountyId !== nextCountyId) {
        setSelectedCountyId(nextCountyId)
      }
      setRegion('全部')
      setSelectedTownshipId(null)
      setSelectedSchoolId(entry.schoolIds?.[0] ?? code)
    })
    // setActiveTab('school-focus', 0)
  }, [deferredSearchText, summaryDataset, selectedCountyId, startTransition, setSelectedCountyId, setSelectedTownshipId, setSelectedSchoolId, setRegion, setActiveTab])

  /* ── UI Flow Orchestration: Auto-tab synchronization disabled as requested ──
  const lastSelectedSchoolId = useRef(selectedSchoolId)
  const lastSelectedTownshipId = useRef(selectedTownshipId)
  const lastSelectedCountyId = useRef(selectedCountyId)

  useEffect(() => {
    // 1. School Focus: if a school was JUST selected (it was null/different, now truthy)
    if (selectedSchoolId && selectedSchoolId !== lastSelectedSchoolId.current) {
      setActiveTab('school-focus', 0)
    }
    // 2. Schools List: if no school selected, but a township was JUST selected
    else if (!selectedSchoolId && selectedTownshipId && selectedTownshipId !== lastSelectedTownshipId.current) {
      setActiveTab('schools', 0)
    }
    // ... (rest of logic)
  }, [selectedSchoolId, selectedTownshipId, selectedCountyId, setActiveTab, region])
  */

  return { derived, scenarioActions, activeScenarioSnapshot }
}
