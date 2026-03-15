import { type Dispatch, type SetStateAction, type TransitionStartFunction } from 'react'
import {
  EDUCATION_LEVELS,
  MANAGEMENT_TYPES,
  type AcademicYear,
  type EducationLevelFilter,
  type ManagementTypeFilter,
  type RegionGroupFilter,
  type EducationSummaryDataset,
} from '../data/educationData'
import { normalizeCountyIds, toCanonicalCountyIds } from './atlasIdentity'
import { createSavedComparisonScenario, writeStoredScenarios } from './atlasHelpers'
import type { InvestigationItem, SavedComparisonScenario } from './types'
import { useAtlasScenarioCrud } from './useAtlasScenarioCrud'
import { DEFAULT_YEAR, type AtlasTab } from './useAtlasQueryState'

type FeedbackController = { message: string | null; show: (message: string) => void }

type ScenarioActionsArgs = {
  summaryDataset: EducationSummaryDataset | null
  activeYear: AcademicYear
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  region: RegionGroupFilter
  selectedCountyId: string | null
  selectedTownshipId: string | null
  selectedSchoolId: string | null
  comparisonScenarioName: string
  comparisonCountyIds?: string[]
  favoriteScenarios: SavedComparisonScenario[]
  activeScenarioSnapshot: Omit<SavedComparisonScenario, 'id' | 'updatedAt'> | null
  filteredAnomalies: InvestigationItem[]
  scopeHeadline: string
  favoritesStorageKey: string
  recentsStorageKey: string
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
  setActiveTab: (tab: AtlasTab, scrollTop?: number) => void
  clearCountyDetailError: () => void
  startTransition: TransitionStartFunction
  copyFeedback: FeedbackController
  scenarioFeedback: FeedbackController
}

export function useAtlasScenarioActions({
  summaryDataset,
  activeYear,
  educationLevel,
  managementType,
  region,
  selectedCountyId,
  selectedTownshipId,
  selectedSchoolId,
  comparisonScenarioName,
  favoriteScenarios,
  activeScenarioSnapshot,
  filteredAnomalies,
  scopeHeadline,
  favoritesStorageKey,
  recentsStorageKey,
  setFavoriteScenarios,
  setRecentScenarios,
  setComparisonCountyIds,
  setComparisonScenarioName,
  setActiveYear,
  setEducationLevel,
  setManagementType,
  setRegion,
  setSelectedCountyId,
  setSelectedTownshipId,
  setSelectedSchoolId,
  setMapResetToken,
  setActiveTab,
  clearCountyDetailError,
  startTransition,
  copyFeedback,
  scenarioFeedback,
}: ScenarioActionsArgs) {
  const pushRecentScenario = (countyIds: string[], scenarioName: string) => {
    if (!summaryDataset) return
    const normalizedCountyIds = normalizeCountyIds(summaryDataset, countyIds).slice(0, 4)
    const storedCountyIds = toCanonicalCountyIds(summaryDataset, normalizedCountyIds)
    const snapshot = createSavedComparisonScenario({
      name: scenarioName.trim() || `比較 ${countyIds.length} 縣市`,
      countyIds: storedCountyIds,
      activeYear,
      educationLevel,
      managementType,
    })
    if (snapshot.countyIds.length === 0) return

    setRecentScenarios((current) => {
      const next = [snapshot, ...current.filter((scenario) => scenario.id !== snapshot.id)].slice(0, 6)
      writeStoredScenarios(recentsStorageKey, next)
      return next
    })
  }

  const handleRegionSelect = (nextRegion: RegionGroupFilter, options?: { skipTabSwitch?: boolean }) => {
    const shouldResetRegion = region === nextRegion && !selectedCountyId

    startTransition(() => {
      setRegion(shouldResetRegion ? '全部' : nextRegion)
      setSelectedCountyId(null)
      setSelectedTownshipId(null)
      setSelectedSchoolId(null)
      clearCountyDetailError()
      setMapResetToken((current) => current + 1)
    })

    if (!options?.skipTabSwitch) {
      // Automatic tab switching is now handled by the orchestration effect
    }
  }

  const handleCountySelect = (countyId: string, options?: { skipTabSwitch?: boolean }) => {
    const shouldResetCounty = selectedCountyId === countyId

    startTransition(() => {
      setSelectedCountyId(shouldResetCounty ? null : countyId)
      setSelectedTownshipId(null)
      setSelectedSchoolId(null)
      clearCountyDetailError()
    })

    if (!shouldResetCounty && !options?.skipTabSwitch) {
      setActiveTab('county', 0)
    }
  }

  const ensureCountySelected = (countyId: string) => {
    if (selectedCountyId === countyId) {
      return
    }

    startTransition(() => {
      setSelectedCountyId(countyId)
      setSelectedTownshipId(null)
      setSelectedSchoolId(null)
      clearCountyDetailError()
    })
    
    // Handled by orchestrator
    setActiveTab('county', 0)
  }

  const handleTownshipSelect = (townshipId: string, options?: { skipTabSwitch?: boolean }) => {
    const shouldResetTownship = selectedTownshipId === townshipId

    startTransition(() => {
      setSelectedTownshipId(shouldResetTownship ? null : townshipId)
      setSelectedSchoolId(null)
    })

    if (!shouldResetTownship && !options?.skipTabSwitch) {
      setActiveTab('schools', 0)
    }
  }

  const handleSchoolSelect = (schoolId: string | null, options?: { skipTabSwitch?: boolean }) => {
    const shouldResetSchool = selectedSchoolId === schoolId
    const nextId = shouldResetSchool ? null : schoolId

    startTransition(() => {
      setSelectedSchoolId(nextId)
      
      // Atomic Hierarchy Completion: Ensure parents are set in the SAME transition
      if (nextId && summaryDataset?.schoolCodeIndex) {
        // Find entry where schoolIds includes this specific level ID
        const entry = Object.values(summaryDataset.schoolCodeIndex).find(e => 
          e.schoolIds?.includes(nextId)
        )
        if (entry) {
          const cid = entry.countyId ?? entry.countyCode ?? null
          const tid = entry.townshipId ?? entry.townCode ?? null
          if (cid) setSelectedCountyId(cid)
          if (tid) setSelectedTownshipId(tid)
        }
      }

      if (nextId && !options?.skipTabSwitch) {
        setActiveTab('school-focus', 0)
      }
    })
  }

  const handleResetScope = () => {
    startTransition(() => {
      setRegion('全部')
      setSelectedCountyId(null)
      setSelectedTownshipId(null)
      setSelectedSchoolId(null)
      clearCountyDetailError()
      setMapResetToken((current) => current + 1)
      setActiveTab('overview', 0)
    })
  }

  /** Breadcrumb navigation: 0=National, 1=County, 2=Township/SchoolList */
  const handleNavigateScope = (depth: number) => {
    if (depth === 0) {
      handleResetScope()
      return
    }

    startTransition(() => {
      if (depth === 1) {
        setSelectedTownshipId(null)
        setSelectedSchoolId(null)
        clearCountyDetailError()
        setActiveTab('county', 0)
      } else if (depth === 2) {
        setSelectedSchoolId(null)
        setActiveTab('schools', 0)
      }
    })
  }

  const toggleComparisonCounty = (countyId: string) => {
    setComparisonCountyIds((current) => {
      if (current.includes(countyId)) {
        const next = current.filter((id) => id !== countyId)
        pushRecentScenario(next, comparisonScenarioName)
        return next.length > 0 ? next : current
      }

      const next = [countyId, ...current].slice(0, 4)
      pushRecentScenario(next, comparisonScenarioName)
      return next
    })
  }

  const handleCopyComparisonLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      copyFeedback.show('比較情境連結已複製')
    } catch {
      copyFeedback.show('無法直接複製，請手動複製網址')
    }
  }

  const applySavedScenario = (scenario: SavedComparisonScenario) => {
    if (!summaryDataset) return
    pushRecentScenario(scenario.countyIds, scenario.name)
    const normalizedCountyIds = normalizeCountyIds(summaryDataset, scenario.countyIds).slice(0, 4)
    startTransition(() => {
      setComparisonScenarioName(scenario.name)
      setComparisonCountyIds(normalizedCountyIds)
      setActiveYear(summaryDataset.years.includes(scenario.activeYear) ? scenario.activeYear : (summaryDataset.years.at(-1) ?? DEFAULT_YEAR))
      setEducationLevel(EDUCATION_LEVELS.includes(scenario.educationLevel) ? scenario.educationLevel : '全部')
      setManagementType(MANAGEMENT_TYPES.includes(scenario.managementType) ? scenario.managementType : '全部')
      setRegion('全部')
      setSelectedCountyId(null)
      setSelectedTownshipId(null)
      setSelectedSchoolId(null)
    })
    setActiveTab('regional', 0)
    scenarioFeedback.show(`已套用情境：${scenario.name}`)
  }

  const crud = useAtlasScenarioCrud({
    favoriteScenarios,
    activeScenarioSnapshot,
    filteredAnomalies,
    scopeHeadline,
    favoritesStorageKey,
    setFavoriteScenarios,
    pushRecentScenario,
    scenarioFeedback,
  })

  return {
    handleRegionSelect,
    handleCountySelect,
    ensureCountySelected,
    handleTownshipSelect,
    handleSchoolSelect,
    handleResetScope,
    handleNavigateScope,
    toggleComparisonCounty,
    handleCopyComparisonLink,
    applySavedScenario,
    ...crud,
  }
}