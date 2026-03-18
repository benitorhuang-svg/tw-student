import { useMemo } from 'react'

import { useHierarchyState } from './derived/useHierarchyState'
import { useAnalyticsState } from './derived/useAnalyticsState'
import { useMarkersState } from './derived/useMarkersState'
import { useInvestigationState } from './derived/useInvestigationState'
import { useUiMetadata } from './derived/useUiMetadata'

import type {
  AtlasLoadObservationSnapshot,
  AcademicYear,
  CountyBucketDataset,
  CountyDetailDataset,
  EducationSummaryDataset,
  EducationLevelFilter,
  ManagementTypeFilter,
  RegionGroupFilter,
  TownshipBoundaryCollection,
} from '../data/educationData'
import { getCountyNotesFromSummary, getTownshipNotesFromSummary } from '../lib/analytics'
import { DEFAULT_YEAR } from './useAtlasQueryState'
import type { InvestigationFilter } from './types'

type DerivedStateArgs = {
  summaryDataset: EducationSummaryDataset | null
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
  countyDetailCache: Record<string, CountyDetailDataset>
  countyBucketCache: Record<string, CountyBucketDataset>
  townshipBoundaryCache: Record<string, TownshipBoundaryCollection>
  countyDetailError: string | null
  loadObservation: AtlasLoadObservationSnapshot
  investigationFilter: InvestigationFilter
  selectedInvestigationId: string | null
}

export function useAtlasDerivedState(args: DerivedStateArgs) {
  const {
    summaryDataset,
    activeYear,
    educationLevel,
    managementType,
    region,
    deferredSearchText,
    selectedCountyId,
    selectedTownshipId,
    selectedSchoolId,
    comparisonCountyIds,
    comparisonScenarioName,
    countyDetailCache,
    countyBucketCache,
    townshipBoundaryCache,
    loadObservation,
    investigationFilter,
    selectedInvestigationId,
  } = args

  // 1. Core Filters
  const filters = useMemo(() => ({
    year: summaryDataset?.years.includes(activeYear) ? activeYear : (summaryDataset?.years.at(-1) ?? DEFAULT_YEAR),
    educationLevel,
    managementType,
    region,
    searchText: deferredSearchText,
  }), [summaryDataset, activeYear, educationLevel, managementType, region, deferredSearchText])

  // 2. Hierarchy Atom
  const hierarchy = useHierarchyState(
    summaryDataset,
    selectedCountyId,
    selectedTownshipId,
    townshipBoundaryCache,
    countyDetailCache
  )

  // 3. Analytics Atom
  const analytics = useAnalyticsState(
    summaryDataset,
    filters,
    hierarchy.selectedCounty,
    hierarchy.activeTownshipId,
    comparisonCountyIds,
    comparisonScenarioName
  )

  // 4. Markers Atom
  const markers = useMarkersState(
    summaryDataset,
    countyDetailCache,
    filters,
    hierarchy.activeTownshipId,
    selectedSchoolId,
    countyBucketCache
  )

  // 5. Investigative Logic
  const scopeNotes = useMemo(() => {
    if (!summaryDataset) return []
    return analytics.selectedTownshipSummary && hierarchy.selectedCounty && hierarchy.activeTownshipId
      ? getTownshipNotesFromSummary(hierarchy.selectedCounty, hierarchy.activeTownshipId)
      : hierarchy.selectedCounty ? getCountyNotesFromSummary(hierarchy.selectedCounty) : (summaryDataset.dataNotes ?? [])
  }, [summaryDataset, analytics.selectedTownshipSummary, hierarchy.selectedCounty, hierarchy.activeTownshipId])

  const investigation = useInvestigationState(
    summaryDataset,
    analytics.countySummaries,
    hierarchy.selectedCounty,
    hierarchy.selectedCountyDetail,
    hierarchy.activeTownshipId,
    analytics.selectedTownshipSummary,
    scopeNotes,
    educationLevel,
    managementType,
    investigationFilter,
    selectedInvestigationId
  )

  // 6. UI Metadata Atom
  const ui = useUiMetadata({
    summaryDataset,
    selectedCountySummary: analytics.selectedCountySummary,
    selectedTownshipSummary: analytics.selectedTownshipSummary,
    activeCountyId: hierarchy.activeCountyId,
    activeTownshipId: hierarchy.activeTownshipId,
    countyRankingRows: analytics.countyRankingRows,
    townshipRows: analytics.townshipRows,
    nationalSummary: analytics.nationalSummary,
    loadObservation,
    selectedCounty: hierarchy.selectedCounty
  })

  // 7. UI Composition
  return useMemo(() => {
    if (!summaryDataset || !ui) {
      return {
        filters: null, countySummaries: [], mapCountySummaries: [], countyRankingRows: [],
        activeCountyId: null, activeTownshipBoundaries: null, activeCountyBuckets: null,
        isTownshipBoundaryLoading: false, selectedCounty: null, selectedCountyDetail: null,
        isCountyDetailLoading: false, selectedCountySummary: null, townshipRows: [],
        allTownshipRows: [], activeTownshipId: null, selectedTownshipSummary: null,
        countyWideSchoolInsights: [], schoolInsights: [], selectedSchool: null, selectedSchoolInsight: null,
        educationDistribution: [], nationalEducationTrendSeries: [], regionalComparisonRows: [],
        currentScope: { label: '全台灣', caption: '', students: 0, schools: 0, delta: 0, deltaRatio: 0, trend: [] },
        rankingRows: [], scopeNotes: [], scopePath: ['全台灣'], allTownshipBoundaries: null,
        effectiveComparisonCountyIds: [], comparisonSummaries: [], comparisonCandidates: [],
        filteredAnomalies: [], activeInvestigation: null, activeScenarioSnapshot: null,
        topRows: [], topCountyPrefetchIds: '', countyQuickPicks: [],
        scopeHeadline: '全台教育工作台', scopeDescription: '', schoolPanelTitle: '縣市細節載入後顯示學校清單',
        generatedAtLabel: '', offlineReadyWithBuckets: 0, observedCounties: [], schoolMapPoints: [],
        globalNationalSummary: { label: '全台灣', caption: '', students: 0, schools: 0, delta: 0, deltaRatio: 0, trend: [] },
        anomaliesCounts: { '全部': 0, '缺年度': 0, '待確認': 0, '停辦/整併': 0, '正式註記': 0 },
      }
    }

    const { activeCountyId } = hierarchy
    const activeCountyBuckets = activeCountyId ? countyBucketCache[activeCountyId] ?? null : null
    const countyQuickPicks = analytics.countySummaries.filter((c) => !c.filteredOut).sort((l, r) => l.name.localeCompare(r.name, 'zh-Hant'))

    return {
      filters, 
      ...analytics, 
      ...hierarchy, 
      ...markers, 
      ...investigation,
      ...ui,
      scopeNotes,
      countyQuickPicks,
      offlineReadyWithBuckets: loadObservation.loadedCountyDetails.length + loadObservation.loadedTownshipSlices.length + loadObservation.loadedBucketSlices.length,
      activeCountyBuckets,
      globalNationalSummary: analytics.nationalSummary,
      isCountyDetailLoading: Boolean(activeCountyId && !hierarchy.selectedCountyDetail),
    }
  }, [summaryDataset, filters, hierarchy, analytics, markers, investigation, scopeNotes, loadObservation, countyBucketCache, ui])
}