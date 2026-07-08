import { create } from 'zustand'
import { createRef, type Dispatch, type RefObject, type SetStateAction } from 'react'
import type { AcademicYear, EducationLevelFilter, ManagementTypeFilter, RegionGroupFilter } from '@/shared/api/data/educationData'
import type { SavedComparisonScenario, InvestigationFilter } from '@/shared/lib/atlas'
import { readInitialQueryState, type AtlasTab } from './useAtlasQueryState'
import { readInitialTheme, type AtlasTheme, COMPARISON_FAVORITES_STORAGE_KEY, COMPARISON_RECENTS_STORAGE_KEY } from '@/shared/lib/utils/constants'
import { readStoredScenarios } from '@/shared/lib/scenario'

type StoreSetter<T> = Dispatch<SetStateAction<T>>

function resolveSetStateAction<T>(action: SetStateAction<T>, current: T): T {
  return typeof action === 'function'
    ? (action as (current: T) => T)(current)
    : action
}

export interface AtlasState {
  // Filters
  activeYear: AcademicYear
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  region: RegionGroupFilter
  searchText: string

  // Navigation
  selectedCountyId: string | null
  selectedTownshipId: string | null
  selectedSchoolId: string | null
  activeTab: AtlasTab
  sidebarRef: RefObject<HTMLDivElement | null>
  tabIsExplicitFromQuery: boolean
  mapResetToken: number
  mapZoom: number | null
  mapLat: number | null
  mapLon: number | null
  forceTownshipLabels: boolean

  // Comparison
  comparisonCountyIds: string[]
  comparisonScenarioName: string
  favoriteScenarios: SavedComparisonScenario[]
  recentScenarios: SavedComparisonScenario[]

  // Interaction
  theme: AtlasTheme
  showGovernancePanel: boolean
  regionalChartView: 'comparison' | 'ranking'
  countyChartView: 'comparison' | 'ranking'
  schoolWorkbenchView: 'list' | 'analysis' | 'notes'
  hoveredCountyId: string | null
  hoveredTownshipId: string | null
  hoveredSchoolId: string | null
  selectedInvestigationId: string | null
  investigationFilter: InvestigationFilter

  initialQueryState: ReturnType<typeof readInitialQueryState>
}

export interface AtlasActions {
  setActiveYear: StoreSetter<AcademicYear>
  setEducationLevel: StoreSetter<EducationLevelFilter>
  setManagementType: StoreSetter<ManagementTypeFilter>
  setRegion: StoreSetter<RegionGroupFilter>
  setSearchText: StoreSetter<string>

  setSelectedCountyId: StoreSetter<string | null>
  setSelectedTownshipId: StoreSetter<string | null>
  setSelectedSchoolId: StoreSetter<string | null>
  setActiveTab: (tab: AtlasTab, scrollTop?: number) => void
  setSidebarRef: (ref: RefObject<HTMLDivElement | null>) => void

  setMapResetToken: StoreSetter<number>
  setMapZoom: StoreSetter<number | null>
  setMapLat: StoreSetter<number | null>
  setMapLon: StoreSetter<number | null>
  setForceTownshipLabels: StoreSetter<boolean>

  setComparisonCountyIds: StoreSetter<string[]>
  setComparisonScenarioName: StoreSetter<string>
  setFavoriteScenarios: StoreSetter<SavedComparisonScenario[]>
  setRecentScenarios: StoreSetter<SavedComparisonScenario[]>

  setTheme: StoreSetter<AtlasTheme>
  setShowGovernancePanel: StoreSetter<boolean>
  setRegionalChartView: StoreSetter<'comparison' | 'ranking'>
  setCountyChartView: StoreSetter<'comparison' | 'ranking'>
  setSchoolWorkbenchView: StoreSetter<'list' | 'analysis' | 'notes'>
  setHoveredCountyId: StoreSetter<string | null>
  setHoveredTownshipId: StoreSetter<string | null>
  setHoveredSchoolId: StoreSetter<string | null>
  setSelectedInvestigationId: StoreSetter<string | null>
  setInvestigationFilter: StoreSetter<InvestigationFilter>
}

const initialQuery = readInitialQueryState()
const sidebarRef = createRef<HTMLDivElement>()
const tabScrollMemory: Partial<Record<AtlasTab, number>> = {}

export const useAtlasStore = create<AtlasState & AtlasActions>((set) => ({
  // Filters
  activeYear: initialQuery.activeYear,
  educationLevel: initialQuery.educationLevel,
  managementType: initialQuery.managementType,
  region: initialQuery.region,
  searchText: initialQuery.searchText,

  // Navigation
  selectedCountyId: initialQuery.selectedCountyId,
  selectedTownshipId: initialQuery.selectedTownshipId,
  selectedSchoolId: initialQuery.selectedSchoolId,
  activeTab: initialQuery.tab,
  sidebarRef,
  tabIsExplicitFromQuery: initialQuery.tabIsExplicit,
  mapResetToken: 0,
  mapZoom: initialQuery.zoom ?? null,
  mapLat: initialQuery.lat ?? null,
  mapLon: initialQuery.lon ?? null,
  forceTownshipLabels: initialQuery.forceTownshipLabels ?? false,

  // Comparison
  comparisonCountyIds: initialQuery.comparisonCountyIds,
  comparisonScenarioName: initialQuery.comparisonScenarioName,
  favoriteScenarios: readStoredScenarios(COMPARISON_FAVORITES_STORAGE_KEY),
  recentScenarios: readStoredScenarios(COMPARISON_RECENTS_STORAGE_KEY),

  // Interaction
  theme: readInitialTheme(),
  showGovernancePanel: false,
  regionalChartView: 'comparison',
  countyChartView: 'ranking',
  schoolWorkbenchView: 'list',
  hoveredCountyId: null,
  hoveredTownshipId: null,
  hoveredSchoolId: null,
  selectedInvestigationId: null,
  investigationFilter: '全部',

  initialQueryState: initialQuery,

  // Actions
  setActiveYear: (activeYear) => set((state) => ({ activeYear: resolveSetStateAction(activeYear, state.activeYear) })),
  setEducationLevel: (educationLevel) => set((state) => ({ educationLevel: resolveSetStateAction(educationLevel, state.educationLevel) })),
  setManagementType: (managementType) => set((state) => ({ managementType: resolveSetStateAction(managementType, state.managementType) })),
  setRegion: (region) => set((state) => ({ region: resolveSetStateAction(region, state.region) })),
  setSearchText: (searchText) => set((state) => ({ searchText: resolveSetStateAction(searchText, state.searchText) })),

  setSelectedCountyId: (selectedCountyId) => set((state) => ({ selectedCountyId: resolveSetStateAction(selectedCountyId, state.selectedCountyId) })),
  setSelectedTownshipId: (selectedTownshipId) => set((state) => ({ selectedTownshipId: resolveSetStateAction(selectedTownshipId, state.selectedTownshipId) })),
  setSelectedSchoolId: (selectedSchoolId) => set((state) => ({ selectedSchoolId: resolveSetStateAction(selectedSchoolId, state.selectedSchoolId) })),

  setActiveTab: (activeTab, scrollTop) => {
    set((state) => {
      if (sidebarRef.current) {
        tabScrollMemory[state.activeTab] = sidebarRef.current.scrollTop
      }

      requestAnimationFrame(() => {
        if (sidebarRef.current) {
          sidebarRef.current.scrollTop = scrollTop ?? tabScrollMemory[activeTab] ?? 0
        }
      })

      return { activeTab }
    })
  },
  setSidebarRef: () => {}, // Deprecated as DOM refs belong in components

  setMapResetToken: (mapResetToken) => set((state) => ({
    mapResetToken: resolveSetStateAction(mapResetToken, state.mapResetToken)
  })),
  setMapZoom: (mapZoom) => set((state) => ({ mapZoom: resolveSetStateAction(mapZoom, state.mapZoom) })),
  setMapLat: (mapLat) => set((state) => ({ mapLat: resolveSetStateAction(mapLat, state.mapLat) })),
  setMapLon: (mapLon) => set((state) => ({ mapLon: resolveSetStateAction(mapLon, state.mapLon) })),
  setForceTownshipLabels: (forceTownshipLabels) => set((state) => ({ forceTownshipLabels: resolveSetStateAction(forceTownshipLabels, state.forceTownshipLabels) })),

  setComparisonCountyIds: (ids) => set((state) => ({
    comparisonCountyIds: resolveSetStateAction(ids, state.comparisonCountyIds)
  })),
  setComparisonScenarioName: (comparisonScenarioName) => set((state) => ({
    comparisonScenarioName: resolveSetStateAction(comparisonScenarioName, state.comparisonScenarioName)
  })),
  setFavoriteScenarios: (scenarios) => set((state) => ({
    favoriteScenarios: resolveSetStateAction(scenarios, state.favoriteScenarios)
  })),
  setRecentScenarios: (scenarios) => set((state) => ({
    recentScenarios: resolveSetStateAction(scenarios, state.recentScenarios)
  })),

  setTheme: (theme) => set((state) => ({ theme: resolveSetStateAction(theme, state.theme) })),
  setShowGovernancePanel: (showGovernancePanel) => set((state) => ({
    showGovernancePanel: resolveSetStateAction(showGovernancePanel, state.showGovernancePanel)
  })),
  setRegionalChartView: (regionalChartView) => set((state) => ({
    regionalChartView: resolveSetStateAction(regionalChartView, state.regionalChartView)
  })),
  setCountyChartView: (countyChartView) => set((state) => ({
    countyChartView: resolveSetStateAction(countyChartView, state.countyChartView)
  })),
  setSchoolWorkbenchView: (schoolWorkbenchView) => set((state) => ({
    schoolWorkbenchView: resolveSetStateAction(schoolWorkbenchView, state.schoolWorkbenchView)
  })),
  setHoveredCountyId: (hoveredCountyId) => set((state) => ({ hoveredCountyId: resolveSetStateAction(hoveredCountyId, state.hoveredCountyId) })),
  setHoveredTownshipId: (hoveredTownshipId) => set((state) => ({ hoveredTownshipId: resolveSetStateAction(hoveredTownshipId, state.hoveredTownshipId) })),
  setHoveredSchoolId: (hoveredSchoolId) => set((state) => ({ hoveredSchoolId: resolveSetStateAction(hoveredSchoolId, state.hoveredSchoolId) })),
  setSelectedInvestigationId: (selectedInvestigationId) => set((state) => ({
    selectedInvestigationId: resolveSetStateAction(selectedInvestigationId, state.selectedInvestigationId)
  })),
  setInvestigationFilter: (investigationFilter) => set((state) => ({
    investigationFilter: resolveSetStateAction(investigationFilter, state.investigationFilter)
  })),
}))
