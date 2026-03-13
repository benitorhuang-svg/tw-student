import { useDeferredValue, useState } from 'react'

import type { AcademicYear, EducationLevelFilter, ManagementTypeFilter, RegionGroupFilter } from '../data/educationData'
import { readStoredScenarios } from './atlasHelpers'
import type { InvestigationFilter, SavedComparisonScenario } from './types'
import { readInitialQueryState, useAtlasTabState } from './useAtlasQueryState'
import {
  COMPARISON_FAVORITES_STORAGE_KEY,
  COMPARISON_RECENTS_STORAGE_KEY,
  readInitialTheme,
  type AtlasTheme,
} from '../lib/constants'

export function useAtlasAppState() {
  const initialQueryState = readInitialQueryState()

  // ── UI state ──
  const [theme, setTheme] = useState<AtlasTheme>(readInitialTheme)
  const [showGovernancePanel, setShowGovernancePanel] = useState(false)
  const [regionalChartView, setRegionalChartView] = useState<'comparison' | 'ranking'>('comparison')
  const [countyChartView, setCountyChartView] = useState<'comparison' | 'ranking'>('ranking')
  const [schoolWorkbenchView, setSchoolWorkbenchView] = useState<'list' | 'analysis' | 'notes'>('list')

  // ── Hover state ──
  const [hoveredCountyId, setHoveredCountyId] = useState<string | null>(null)
  const [hoveredTownshipId, setHoveredTownshipId] = useState<string | null>(null)
  const [hoveredSchoolId, setHoveredSchoolId] = useState<string | null>(null)

  // ── Filter state ──
  const [activeYear, setActiveYear] = useState<AcademicYear>(initialQueryState.activeYear)
  const [educationLevel, setEducationLevel] = useState<EducationLevelFilter>(initialQueryState.educationLevel)
  const [managementType, setManagementType] = useState<ManagementTypeFilter>(initialQueryState.managementType)
  const [region, setRegion] = useState<RegionGroupFilter>(initialQueryState.region)
  const [searchText, setSearchText] = useState(initialQueryState.searchText)
  const deferredSearchText = useDeferredValue(searchText)

  // ── Selection state ──
  const [selectedCountyId, setSelectedCountyId] = useState<string | null>(initialQueryState.selectedCountyId)
  const [selectedTownshipId, setSelectedTownshipId] = useState<string | null>(initialQueryState.selectedTownshipId)
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(initialQueryState.selectedSchoolId)

  // ── Comparison state ──
  const [comparisonCountyIds, setComparisonCountyIds] = useState<string[]>(initialQueryState.comparisonCountyIds)
  const [comparisonScenarioName, setComparisonScenarioName] = useState(initialQueryState.comparisonScenarioName)
  const [favoriteScenarios, setFavoriteScenarios] = useState<SavedComparisonScenario[]>(() => readStoredScenarios(COMPARISON_FAVORITES_STORAGE_KEY))
  const [recentScenarios, setRecentScenarios] = useState<SavedComparisonScenario[]>(() => readStoredScenarios(COMPARISON_RECENTS_STORAGE_KEY))

  // ── Investigation state ──
  const [selectedInvestigationId, setSelectedInvestigationId] = useState<string | null>(null)
  const [investigationFilter, setInvestigationFilter] = useState<InvestigationFilter>('全部')

  // ── Tab + map state ──
  const { activeTab, setActiveTab, sidebarRef } = useAtlasTabState(initialQueryState.tab)
  const [tabIsExplicitFromQuery] = useState(initialQueryState.tabIsExplicit)
  const [mapResetToken, setMapResetToken] = useState(0)
  const [mapZoom, setMapZoom] = useState<number | null>(initialQueryState.zoom ?? null)
  const [mapLat, setMapLat] = useState<number | null>(initialQueryState.lat ?? null)
  const [mapLon, setMapLon] = useState<number | null>(initialQueryState.lon ?? null)
  const [forceTownshipLabels, setForceTownshipLabels] = useState<boolean>(initialQueryState.forceTownshipLabels ?? false)

  return {
    initialQueryState,
    // UI
    theme, setTheme,
    showGovernancePanel, setShowGovernancePanel,
    regionalChartView, setRegionalChartView,
    countyChartView, setCountyChartView,
    schoolWorkbenchView, setSchoolWorkbenchView,
    // Hover
    hoveredCountyId, setHoveredCountyId,
    hoveredTownshipId, setHoveredTownshipId,
    hoveredSchoolId, setHoveredSchoolId,
    // Filters
    activeYear, setActiveYear,
    educationLevel, setEducationLevel,
    managementType, setManagementType,
    region, setRegion,
    searchText, setSearchText,
    deferredSearchText,
    // Selection
    selectedCountyId, setSelectedCountyId,
    selectedTownshipId, setSelectedTownshipId,
    selectedSchoolId, setSelectedSchoolId,
    // Comparison
    comparisonCountyIds, setComparisonCountyIds,
    comparisonScenarioName, setComparisonScenarioName,
    favoriteScenarios, setFavoriteScenarios,
    recentScenarios, setRecentScenarios,
    // Investigation
    selectedInvestigationId, setSelectedInvestigationId,
    investigationFilter, setInvestigationFilter,
    // Tab + map
    activeTab, setActiveTab, sidebarRef,
    tabIsExplicitFromQuery,
    mapResetToken, setMapResetToken,
    mapZoom, setMapZoom,
    mapLat, setMapLat,
    mapLon, setMapLon,
    forceTownshipLabels, setForceTownshipLabels,
  }
}
