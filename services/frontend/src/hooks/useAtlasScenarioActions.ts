import { type Dispatch, type SetStateAction, type TransitionStartFunction } from 'react'
import type { 
  AcademicYear, 
  EducationLevelFilter, 
  ManagementTypeFilter, 
  RegionGroupFilter, 
  EducationSummaryDataset 
} from '../data/educationData'
import type { InvestigationItem, SavedComparisonScenario } from './types'
import { useAtlasScenarioCrud } from './useAtlasScenarioCrud'
import { useAtlasNavigationActions } from './useAtlasNavigationActions'
import { useAtlasComparisonActions } from './useAtlasComparisonActions'
import type { AtlasTab } from './useAtlasQueryState'

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
  setMapZoom: Dispatch<SetStateAction<number | null>>
  setMapLat: Dispatch<SetStateAction<number | null>>
  setMapLon: Dispatch<SetStateAction<number | null>>
  startTransition: TransitionStartFunction
  copyFeedback: FeedbackController
  scenarioFeedback: FeedbackController
}

/**
 * Organism-level orchestrator for Atlas interactions.
 * Combines navigation, comparison, and CRUD logic.
 */
export function useAtlasScenarioActions(args: ScenarioActionsArgs) {
  
  const nav = useAtlasNavigationActions({
    summaryDataset: args.summaryDataset,
    region: args.region,
    selectedCountyId: args.selectedCountyId,
    selectedTownshipId: args.selectedTownshipId,
    selectedSchoolId: args.selectedSchoolId,
    setRegion: args.setRegion,
    setSelectedCountyId: args.setSelectedCountyId,
    setSelectedTownshipId: args.setSelectedTownshipId,
    setSelectedSchoolId: args.setSelectedSchoolId,
    setMapResetToken: args.setMapResetToken,
    setMapZoom: args.setMapZoom,
    setMapLat: args.setMapLat,
    setMapLon: args.setMapLon,
    setActiveTab: args.setActiveTab,
    clearCountyDetailError: args.clearCountyDetailError,
    startTransition: args.startTransition,
  })

  const comp = useAtlasComparisonActions({
    summaryDataset: args.summaryDataset,
    activeYear: args.activeYear,
    educationLevel: args.educationLevel,
    managementType: args.managementType,
    comparisonScenarioName: args.comparisonScenarioName,
    recentsStorageKey: args.recentsStorageKey,
    setRecentScenarios: args.setRecentScenarios,
    setComparisonCountyIds: args.setComparisonCountyIds,
    setComparisonScenarioName: args.setComparisonScenarioName,
    setActiveYear: args.setActiveYear,
    setEducationLevel: args.setEducationLevel,
    setManagementType: args.setManagementType,
    setRegion: args.setRegion,
    setSelectedCountyId: args.setSelectedCountyId,
    setSelectedTownshipId: args.setSelectedTownshipId,
    setSelectedSchoolId: args.setSelectedSchoolId,
    setActiveTab: args.setActiveTab,
    startTransition: args.startTransition,
    copyFeedback: args.copyFeedback,
    scenarioFeedback: args.scenarioFeedback,
  })

  const crud = useAtlasScenarioCrud({
    favoriteScenarios: args.favoriteScenarios,
    activeScenarioSnapshot: args.activeScenarioSnapshot,
    filteredAnomalies: args.filteredAnomalies,
    scopeHeadline: args.scopeHeadline,
    favoritesStorageKey: args.favoritesStorageKey,
    setFavoriteScenarios: args.setFavoriteScenarios,
    pushRecentScenario: comp.pushRecentScenario,
    scenarioFeedback: args.scenarioFeedback,
  })

  return {
    ...nav,
    ...comp,
    ...crud,
  }
}