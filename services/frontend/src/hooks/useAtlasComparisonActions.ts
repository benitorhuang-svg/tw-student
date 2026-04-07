import { type Dispatch, type SetStateAction, type TransitionStartFunction } from 'react'
import {
  EDUCATION_LEVELS,
  MANAGEMENT_TYPES,
  type AcademicYear,
  type EducationLevelFilter,
  type ManagementTypeFilter,
  type EducationSummaryDataset,
  type RegionGroupFilter,
} from '../data/educationData'
import { normalizeCountyIds, toCanonicalCountyIds } from './atlasIdentity'
import { createSavedComparisonScenario, writeStoredScenarios } from './atlasHelpers'
import type { SavedComparisonScenario } from './types'
import { DEFAULT_YEAR, type AtlasTab } from './useAtlasQueryState'

type FeedbackController = { message: string | null; show: (message: string) => void }

type ComparisonActionsArgs = {
  summaryDataset: EducationSummaryDataset | null
  activeYear: AcademicYear
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  comparisonScenarioName: string
  recentsStorageKey: string
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
  setActiveTab: (tab: AtlasTab, scrollTop?: number) => void
  startTransition: TransitionStartFunction
  copyFeedback: FeedbackController
  scenarioFeedback: FeedbackController
}

export function useAtlasComparisonActions({
  summaryDataset,
  activeYear,
  educationLevel,
  managementType,
  comparisonScenarioName,
  recentsStorageKey,
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
  setActiveTab,
  startTransition,
  copyFeedback,
  scenarioFeedback,
}: ComparisonActionsArgs) {

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
    // 'regional' page removed — redirect users to overview instead
    setActiveTab('overview', 0)
    scenarioFeedback.show(`已套用情境：${scenario.name}`)
  }

  return {
    pushRecentScenario,
    toggleComparisonCounty,
    handleCopyComparisonLink,
    applySavedScenario,
  }
}
