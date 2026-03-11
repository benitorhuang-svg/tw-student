import type { SchoolMapPoint } from '../components/TaiwanExplorerMap'
import type {
  AtlasLoadObservationSnapshot,
  AcademicYear,
  CountyBucketDataset,
  CountyDetailDataset,
  EducationSummaryDataset,
  EducationLevelFilter,
  ManagementTypeFilter,
  RegionGroupFilter,
  SchoolLevel,
  SchoolManagementType,
  TownshipBoundaryCollection,
} from '../data/educationData'
import {
  getCountyComparisonSummaries,
  getCountyNotesFromSummary,
  getCountyRankingRows,
  getCountyScopeSummaryFromSummary,
  getCountySummaries,
  getNationalEducationDistribution,
  getNationalEducationTrendSeries,
  getRegionalComparisonRows,
  getNationSummary,
  getSchoolInsights,
  getTownshipNotesFromSummary,
  getTownshipScopeSummaryFromSummary,
  getTownshipSummaries,
} from '../lib/analytics'
import { normalizeCountyId, normalizeCountyIds, normalizeTownshipId, resolveCountyRecord, toCanonicalCountyIds } from './atlasIdentity'
import { buildInvestigationItems, classifyInvestigation } from './buildInvestigationItems'
import type { InvestigationFilter } from './types'
import { DEFAULT_YEAR } from './useAtlasQueryState'

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

export function useAtlasDerivedState({
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
  countyDetailError,
  loadObservation,
  investigationFilter,
  selectedInvestigationId,
}: DerivedStateArgs) {
  if (!summaryDataset) {
    return {
      filters: null,
      countySummaries: [],
      countyRankingRows: [],
      activeCountyId: null,
      activeTownshipBoundaries: null,
      activeCountyBuckets: null,
      isTownshipBoundaryLoading: false,
      selectedCounty: null,
      selectedCountyDetail: null,
      isCountyDetailLoading: false,
      selectedCountySummary: null,
      townshipRows: [],
      activeTownshipId: null,
      selectedTownshipSummary: null,
      countyWideSchoolInsights: [],
      schoolInsights: [],
      selectedSchool: null,
      educationDistribution: [],
      nationalEducationTrendSeries: [],
      regionalComparisonRows: [],
      currentScope: { label: '全台灣', caption: '', students: 0, schools: 0, delta: 0, deltaRatio: 0, trend: [] },
      rankingRows: [],
      scopeNotes: [],
      scopePath: ['全台灣'],
      effectiveComparisonCountyIds: [],
      comparisonSummaries: [],
      comparisonCandidates: [],
      filteredAnomalies: [],
      activeInvestigation: null,
      activeScenarioSnapshot: null,
      topRows: [],
      topCountyPrefetchIds: '',
      countyQuickPicks: [],
      scopeHeadline: '全台教育工作台',
      scopeDescription: '',
      schoolPanelTitle: '縣市細節載入後顯示學校清單',
      generatedAtLabel: '',
      offlineReadyWithBuckets: 0,
      observedCounties: [],
      schoolMapPoints: [],
    }
  }

  const filters = {
    year: summaryDataset.years.includes(activeYear) ? activeYear : (summaryDataset.years.at(-1) ?? DEFAULT_YEAR),
    educationLevel,
    managementType,
    region,
    searchText: deferredSearchText,
  }

  const selectedCountyFromDataset = resolveCountyRecord(summaryDataset, selectedCountyId)
  const countySummaries = getCountySummaries(summaryDataset.counties, filters)
  const countyRankingRows = getCountyRankingRows(countySummaries)
  const activeCountyId = selectedCountyFromDataset ? normalizeCountyId(summaryDataset, selectedCountyId) : null
  const activeTownshipBoundaries = activeCountyId ? townshipBoundaryCache[activeCountyId] ?? null : null
  const activeCountyBuckets = activeCountyId ? countyBucketCache[activeCountyId] ?? null : null
  const isTownshipBoundaryLoading = Boolean(activeCountyId && !activeTownshipBoundaries)
  const selectedCounty = summaryDataset.counties.find((county) => county.id === activeCountyId) ?? null
  const selectedCountyDetail = activeCountyId ? countyDetailCache[activeCountyId] ?? null : null
  const isCountyDetailLoading = Boolean(activeCountyId && !selectedCountyDetail && !countyDetailError)
  const selectedCountySummary = selectedCounty ? getCountyScopeSummaryFromSummary(selectedCounty, filters) : null
  const townshipRows = selectedCounty ? getTownshipSummaries(selectedCounty, filters) : []
  const activeTownshipId = selectedCounty ? normalizeTownshipId(summaryDataset, activeCountyId, selectedTownshipId) : null
  const selectedTownshipSummary = selectedCounty && activeTownshipId
    ? getTownshipScopeSummaryFromSummary(selectedCounty, activeTownshipId, filters)
    : null
  const countyWideSchoolInsights = getSchoolInsights(selectedCountyDetail, filters, null)
  const schoolInsights = getSchoolInsights(selectedCountyDetail, filters, activeTownshipId)
  const activeSchoolId = countyWideSchoolInsights.some((school) => school.id === selectedSchoolId) ? selectedSchoolId : null
  const selectedSchool = activeSchoolId
    ? countyWideSchoolInsights.find((school) => school.id === activeSchoolId) ?? null
    : null
  const nationalSummary = getNationSummary(summaryDataset.counties, filters)
  const educationDistribution = getNationalEducationDistribution(summaryDataset.counties, filters)
  const nationalEducationTrendSeries = getNationalEducationTrendSeries(summaryDataset.counties, filters)
  const regionalComparisonRows = getRegionalComparisonRows(summaryDataset.counties, filters)
  const currentScope = selectedTownshipSummary ?? selectedCountySummary ?? nationalSummary
  const rankingRows = selectedCounty ? townshipRows : countyRankingRows
  const scopeNotes = selectedTownshipSummary && selectedCounty && activeTownshipId
    ? getTownshipNotesFromSummary(selectedCounty, activeTownshipId)
    : selectedCounty ? getCountyNotesFromSummary(selectedCounty) : []

  const scopePath = ['全台']
  if (selectedCountySummary) scopePath.push(selectedCountySummary.label)
  if (selectedTownshipSummary) scopePath.push(selectedTownshipSummary.label)

  const validComparisonIds = normalizeCountyIds(summaryDataset, comparisonCountyIds)
  const effectiveComparisonCountyIds = (validComparisonIds.length > 0 ? validComparisonIds : countyRankingRows.map((row) => row.id).slice(0, 4)).slice(0, 4)
  const comparisonSummaries = getCountyComparisonSummaries(summaryDataset.counties, effectiveComparisonCountyIds, filters)
  const comparisonCandidateIds = [...new Set([...effectiveComparisonCountyIds, ...countyRankingRows.slice(0, 8).map((row) => row.id)])]
  const comparisonCandidates = comparisonCandidateIds
    .map((countyId) => {
      const rankingRow = countyRankingRows.find((row) => row.id === countyId)
      const summaryRow = countySummaries.find((row) => row.id === countyId)
      return { id: countyId, displayName: summaryRow?.name ?? rankingRow?.label ?? countyId }
    })
    .filter((row) => row.displayName !== row.id || summaryDataset.counties.some((county) => county.id === row.id))

  const anomalies = buildInvestigationItems({
    summaryDataset,
    countySummaries,
    countyRankingRows,
    selectedCounty,
    selectedCountyDetail,
    selectedTownshipId: activeTownshipId,
    selectedTownshipSummary,
    scopeNotes,
    filters: { educationLevel, managementType },
  })
  const filteredAnomalies = anomalies.filter((item) => investigationFilter === '全部' || classifyInvestigation(item) === investigationFilter)
  const activeInvestigation = filteredAnomalies.find((item) => item.id === selectedInvestigationId) ?? filteredAnomalies[0] ?? null

  const activeScenarioSnapshot = comparisonCountyIds.length > 0
    ? {
        name: comparisonScenarioName.trim() || `比較 ${comparisonCountyIds.length} 縣市`,
        countyIds: toCanonicalCountyIds(summaryDataset, comparisonCountyIds).slice(0, 4),
        activeYear: filters.year,
        educationLevel,
        managementType,
      }
    : null

  const topRows = rankingRows.slice(0, 6)
  const topCountyPrefetchIds = selectedCounty ? '' : countyRankingRows.slice(0, 3).map((row) => row.id).join('|')
  const countyQuickPicks = countySummaries.filter((county) => !county.filteredOut).sort((left, right) => left.name.localeCompare(right.name, 'zh-Hant'))
  const scopeHeadline = selectedTownshipSummary
    ? `${selectedTownshipSummary.label} 校務分布`
    : selectedCountySummary ? `${selectedCountySummary.label} 教育版圖` : '全台教育工作台'
  const scopeDescription = selectedTownshipSummary
    ? '已切到鄉鎮層級，左側表格與異常面板同步聚焦同一範圍。'
    : selectedCountySummary
      ? '已聚焦指定縣市，右側地圖呈現鄉鎮界線與校點分群，左側同步顯示比較與學校明細。'
      : '上方篩選列負責切片條件，左側分析工作台負責比較、排行與治理，右側專注地圖探索。'
  const schoolPanelTitle = selectedTownshipSummary
    ? `${selectedTownshipSummary.label} 學校清單`
    : selectedCountySummary ? `${selectedCountySummary.label} 重點學校` : '縣市細節載入後顯示學校清單'
  const generatedAtLabel = new Date(summaryDataset.generatedAt).toLocaleString('zh-TW')
  const offlineReadySlices = loadObservation.loadedCountyDetails.length + loadObservation.loadedTownshipSlices.length
  const offlineReadyWithBuckets = offlineReadySlices + loadObservation.loadedBucketSlices.length

  const observedCounties = summaryDataset.counties
    .filter((county) =>
      loadObservation.loadedCountyDetails.includes(county.id) ||
      loadObservation.loadedBucketSlices.includes(county.id) ||
      loadObservation.loadedTownshipSlices.includes(county.id),
    )
    .map((county) => ({
      id: county.id,
      name: county.name,
      detailBytes: loadObservation.resourceSizes[county.detailFile] ?? county.assetMetrics?.detailBytes ?? 0,
      bucketBytes: loadObservation.resourceSizes[county.bucketFile] ?? county.assetMetrics?.bucketBytes ?? 0,
      townshipBytes: loadObservation.resourceSizes[county.townshipFile] ?? county.assetMetrics?.townshipBytes ?? 0,
      hasBucketSlice: loadObservation.loadedBucketSlices.includes(county.id),
      hasTownshipSlice: loadObservation.loadedTownshipSlices.includes(county.id),
    }))

  const schoolRecordLookup = new Map(
    (selectedCountyDetail?.towns ?? []).flatMap((township) => township.schools.map((school) => [school.id, school] as const)),
  )
  const visibleSchoolInsights = activeTownshipId
    ? schoolInsights
    : selectedSchool
      ? countyWideSchoolInsights
      : schoolInsights

  const schoolMapPoints: SchoolMapPoint[] = visibleSchoolInsights.reduce<SchoolMapPoint[]>((points, school) => {
    const rawSchool = schoolRecordLookup.get(school.id)
    if (!rawSchool) return points
    const { latitude, longitude } = rawSchool.coordinates
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (latitude === 0 && longitude === 0)) return points
    points.push({
      id: school.id,
      name: school.name,
      townshipName: school.townshipName,
      educationLevel: school.educationLevel as SchoolLevel,
      managementType: school.managementType as SchoolManagementType,
      status: school.status ?? '正常',
      currentStudents: school.currentStudents,
      delta: school.delta,
      deltaRatio: school.deltaRatio,
      latitude,
      longitude,
      website: rawSchool.profileUrl ?? rawSchool.website,
    })
    return points
  }, [])

  return {
    filters, countySummaries, countyRankingRows,
    activeCountyId, activeTownshipBoundaries, activeCountyBuckets, isTownshipBoundaryLoading,
    selectedCounty, selectedCountyDetail, isCountyDetailLoading, selectedCountySummary,
    townshipRows, activeTownshipId, selectedTownshipSummary,
    countyWideSchoolInsights, schoolInsights, selectedSchool,
    educationDistribution, nationalEducationTrendSeries, regionalComparisonRows, currentScope, rankingRows, scopeNotes, scopePath,
    effectiveComparisonCountyIds, comparisonSummaries, comparisonCandidates,
    filteredAnomalies, activeInvestigation, activeScenarioSnapshot,
    topRows, topCountyPrefetchIds, countyQuickPicks,
    scopeHeadline, scopeDescription, schoolPanelTitle, generatedAtLabel,
    offlineReadyWithBuckets, observedCounties, schoolMapPoints,
  }
}