import { useDeferredValue, useEffect, useState, useTransition, type ChangeEvent } from 'react'

import './App.css'

import AnomalyPanel from './components/AnomalyPanel'
import ComparisonPanel from './components/ComparisonPanel'
import FilterBar from './components/FilterBar'
import InsightPanel from './components/InsightPanel'
import SchoolDetailPanel from './components/SchoolDetailPanel'
import ScopePanel from './components/ScopePanel'
import TaiwanExplorerMap, { type SchoolMapPoint } from './components/TaiwanExplorerMap'
import {
  ACADEMIC_YEARS,
  EDUCATION_LEVELS,
  MANAGEMENT_TYPES,
  REGION_GROUPS,
  prefetchCountyResources,
  type AcademicYear,
  type EducationLevelFilter,
  type ManagementTypeFilter,
  type RegionGroupFilter,
  type SchoolLevel,
  type SchoolManagementType,
} from './data/educationData'
import {
  formatFileSize,
  getCountyComparisonSummaries,
  getCountyNotesFromSummary,
  getCountyRankingRows,
  getCountyScopeSummaryFromSummary,
  getCountySummaries,
  getNationalEducationDistribution,
  getNationSummary,
  getSchoolInsights,
  getTownshipNotesFromSummary,
  getTownshipScopeSummaryFromSummary,
  getTownshipSummaries,
} from './lib/analytics'
import type { InvestigationFilter, SavedComparisonScenario } from './hooks/types'
import {
  createSavedComparisonScenario,
  downloadCsvFile,
  downloadJsonFile,
  readStoredScenarios,
  readStoredScenariosFromText,
  writeStoredScenarios,
} from './hooks/atlasHelpers'
import { buildInvestigationItems, classifyInvestigation } from './hooks/buildInvestigationItems'
import { useEducationData } from './hooks/useEducationData'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { useAtlasLoadObservation } from './hooks/useAtlasLoadObservation'
import { useFeedbackMessage } from './hooks/useFeedbackMessage'
import { useYearPlayback } from './hooks/useYearPlayback'

const DEFAULT_YEAR = ACADEMIC_YEARS.at(-1) ?? 113
const COMPARISON_FAVORITES_STORAGE_KEY = 'tw-atlas-comparison-favorites'
const COMPARISON_RECENTS_STORAGE_KEY = 'tw-atlas-comparison-recents'

type AtlasTab = 'overview' | 'regional' | 'schools'

function readInitialQueryState() {
  const params = new URLSearchParams(window.location.search)
  const year = Number(params.get('year'))
  const educationLevel = params.get('level')
  const managementType = params.get('management')
  const region = params.get('region')
  const compare = params.get('compare')

  return {
    activeYear: ACADEMIC_YEARS.includes(year as AcademicYear) ? (year as AcademicYear) : DEFAULT_YEAR,
    educationLevel: EDUCATION_LEVELS.includes(educationLevel as EducationLevelFilter)
      ? (educationLevel as EducationLevelFilter)
      : '全部',
    managementType: MANAGEMENT_TYPES.includes(managementType as ManagementTypeFilter)
      ? (managementType as ManagementTypeFilter)
      : '全部',
    region: REGION_GROUPS.includes(region as RegionGroupFilter) ? (region as RegionGroupFilter) : '全部',
    searchText: params.get('search') ?? '',
    selectedCountyId: params.get('county'),
    selectedTownshipId: params.get('township'),
    comparisonCountyIds: compare ? compare.split(',').map((v) => v.trim()).filter(Boolean) : [],
    comparisonScenarioName: params.get('scenario') ?? '',
    tab: (params.get('tab') as AtlasTab) || 'overview',
  }
}

function App() {
  const initialQueryState = readInitialQueryState()

  // ── Extracted hooks ──
  const isOffline = useOnlineStatus()
  const loadObservation = useAtlasLoadObservation()
  const [isPending, startTransition] = useTransition()
  const copyFeedback = useFeedbackMessage()
  const scenarioFeedback = useFeedbackMessage()

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
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null)

  // ── Comparison state ──
  const [comparisonCountyIds, setComparisonCountyIds] = useState<string[]>(initialQueryState.comparisonCountyIds)
  const [comparisonScenarioName, setComparisonScenarioName] = useState(initialQueryState.comparisonScenarioName)
  const [favoriteScenarios, setFavoriteScenarios] = useState<SavedComparisonScenario[]>(() => readStoredScenarios(COMPARISON_FAVORITES_STORAGE_KEY))
  const [recentScenarios, setRecentScenarios] = useState<SavedComparisonScenario[]>(() => readStoredScenarios(COMPARISON_RECENTS_STORAGE_KEY))

  // ── Investigation state ──
  const [selectedInvestigationId, setSelectedInvestigationId] = useState<string | null>(null)
  const [investigationFilter, setInvestigationFilter] = useState<InvestigationFilter>('全部')

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<AtlasTab>(initialQueryState.tab)

  // ── Data hooks ──
  const {
    summaryDataset,
    countyBoundaries,
    countyDetailCache,
    countyBucketCache,
    townshipBoundaryCache,
    loadError,
    countyDetailError,
    clearCountyDetailError,
    prefetchCounty,
    prefetchAllCounties,
  } = useEducationData(selectedCountyId)

  const [isYearPlaybackActive, setIsYearPlaybackActive] = useYearPlayback(summaryDataset, setActiveYear, startTransition)

  // ── URL sync effect ──
  useEffect(() => {
    if (!summaryDataset) return

    const params = new URLSearchParams()
    params.set('year', String(summaryDataset.years.includes(activeYear) ? activeYear : summaryDataset.years.at(-1) ?? activeYear))

    if (educationLevel !== '全部') params.set('level', educationLevel)
    if (managementType !== '全部') params.set('management', managementType)
    if (region !== '全部') params.set('region', region)
    if (deferredSearchText.trim()) params.set('search', deferredSearchText.trim())

    const cleanedComparisonIds = comparisonCountyIds.filter((cid) => summaryDataset.counties.some((c) => c.id === cid))
    if (cleanedComparisonIds.length > 0) params.set('compare', cleanedComparisonIds.join(','))
    if (comparisonScenarioName.trim()) params.set('scenario', comparisonScenarioName.trim())

    const countyIdForUrl = summaryDataset.counties.some((c) => c.id === selectedCountyId) ? selectedCountyId : null
    if (countyIdForUrl) params.set('county', countyIdForUrl)

    const townshipIdForUrl = countyIdForUrl
      ? summaryDataset.counties.find((c) => c.id === countyIdForUrl)?.towns.some((t) => t.id === selectedTownshipId) ? selectedTownshipId : null
      : null
    if (townshipIdForUrl) params.set('township', townshipIdForUrl)

    if (activeTab !== 'overview') params.set('tab', activeTab)

    const nextSearch = params.toString()
    const nextUrl = nextSearch ? `${window.location.pathname}?${nextSearch}` : window.location.pathname
    window.history.replaceState({}, '', nextUrl)
  }, [activeTab, activeYear, comparisonCountyIds, comparisonScenarioName, deferredSearchText, educationLevel, managementType, region, selectedCountyId, selectedTownshipId, summaryDataset])

  // ── Top-3 prefetch ──
  useEffect(() => {
    if (!summaryDataset || selectedCountyId) return

    const prefetchFilters = {
      year: summaryDataset.years.includes(activeYear) ? activeYear : (summaryDataset.years.at(-1) ?? DEFAULT_YEAR),
      educationLevel,
      managementType,
      region,
      searchText: deferredSearchText,
    }

    const topCounties = getCountyRankingRows(getCountySummaries(summaryDataset.counties, prefetchFilters)).slice(0, 3)
    topCounties
      .map((row) => summaryDataset.counties.find((c) => c.id === row.id))
      .filter((county): county is NonNullable<typeof county> => Boolean(county))
      .forEach((county) => {
        void prefetchCountyResources(county, { includeTownshipSlice: true, includeBucketSlice: true })
      })
  }, [activeYear, deferredSearchText, educationLevel, managementType, region, selectedCountyId, summaryDataset])

  // ── Loading / error guards ──
  if (loadError) {
    return (
      <div className="app-shell">
        <section className="hero-panel hero-panel--single">
          <div className="hero-panel__content">
            <p className="eyebrow">資料載入失敗</p>
            <h1>正式資料尚未成功載入</h1>
            <p className="hero-panel__description">{loadError}</p>
          </div>
        </section>
      </div>
    )
  }

  if (!summaryDataset || !countyBoundaries) {
    return (
      <div className="app-shell">
        <section className="hero-panel hero-panel--single">
          <div className="hero-panel__content">
            <p className="eyebrow">正式資料準備中</p>
            <h1>正在載入教育部與官方行政區資料</h1>
            <p className="hero-panel__description">系統正在先載入全台摘要與官方縣市界線，縣市細節會在需要時按需補載。</p>
          </div>
        </section>
      </div>
    )
  }

  // ── Computed derivations ──
  const filters = {
    year: summaryDataset.years.includes(activeYear) ? activeYear : (summaryDataset.years.at(-1) ?? DEFAULT_YEAR),
    educationLevel,
    managementType,
    region,
    searchText: deferredSearchText,
  }

  const selectedCountyFromDataset = summaryDataset.counties.find((c) => c.id === selectedCountyId) ?? null
  const countySummaries = getCountySummaries(summaryDataset.counties, filters)
  const countyRankingRows = getCountyRankingRows(countySummaries)
  const activeCountyId = selectedCountyFromDataset && countySummaries.some((c) => c.id === selectedCountyId && !c.filteredOut)
    ? selectedCountyId
    : null
  const activeTownshipBoundaries = activeCountyId ? townshipBoundaryCache[activeCountyId] ?? null : null
  const activeCountyBuckets = activeCountyId ? countyBucketCache[activeCountyId] ?? null : null
  const isTownshipBoundaryLoading = Boolean(activeCountyId && !activeTownshipBoundaries)
  const selectedCounty = summaryDataset.counties.find((c) => c.id === activeCountyId) ?? null
  const selectedCountyDetail = activeCountyId ? countyDetailCache[activeCountyId] ?? null : null
  const isCountyDetailLoading = Boolean(activeCountyId && !selectedCountyDetail && !countyDetailError)
  const selectedCountySummary = selectedCounty ? getCountyScopeSummaryFromSummary(selectedCounty, filters) : null
  const townshipRows = selectedCounty ? getTownshipSummaries(selectedCounty, filters) : []
  const activeTownshipId = selectedCounty && townshipRows.some((t) => t.id === selectedTownshipId) ? selectedTownshipId : null
  const selectedTownshipSummary = selectedCounty && activeTownshipId
    ? getTownshipScopeSummaryFromSummary(selectedCounty, activeTownshipId, filters)
    : null
  const schoolInsights = getSchoolInsights(selectedCountyDetail, filters, activeTownshipId)
  const activeSchoolId = schoolInsights.some((s) => s.id === selectedSchoolId) ? selectedSchoolId : null
  const selectedSchool = schoolInsights.find((s) => s.id === activeSchoolId) ?? schoolInsights.at(0) ?? null
  const nationalSummary = getNationSummary(summaryDataset.counties, filters)
  const educationDistribution = getNationalEducationDistribution(summaryDataset.counties, filters)
  const currentScope = selectedTownshipSummary ?? selectedCountySummary ?? nationalSummary
  const rankingRows = selectedCounty ? townshipRows : countyRankingRows

  const scopeNotes = selectedTownshipSummary && selectedCounty && activeTownshipId
    ? getTownshipNotesFromSummary(selectedCounty, activeTownshipId)
    : selectedCounty ? getCountyNotesFromSummary(selectedCounty) : []

  const scopePath = ['全台灣']
  if (selectedCountySummary) scopePath.push(selectedCountySummary.label)
  if (selectedTownshipSummary) scopePath.push(selectedTownshipSummary.label)

  const validComparisonIds = comparisonCountyIds.filter((cid) => summaryDataset.counties.some((c) => c.id === cid))
  const effectiveComparisonCountyIds = (validComparisonIds.length > 0 ? validComparisonIds : countyRankingRows.map((r) => r.id).slice(0, 4)).slice(0, 4)
  const comparisonSummaries = getCountyComparisonSummaries(summaryDataset.counties, effectiveComparisonCountyIds, filters)
  const comparisonCandidateIds = [...new Set([...effectiveComparisonCountyIds, ...countyRankingRows.slice(0, 8).map((r) => r.id)])]
  const comparisonCandidates = comparisonCandidateIds
    .map((cid) => {
      const rankingRow = countyRankingRows.find((r) => r.id === cid)
      const summaryRow = countySummaries.find((r) => r.id === cid)
      return { id: cid, displayName: summaryRow?.name ?? rankingRow?.label ?? cid }
    })
    .filter((row) => row.displayName !== row.id || summaryDataset.counties.some((c) => c.id === row.id))

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
    ? createSavedComparisonScenario({
        name: comparisonScenarioName.trim() || `比較 ${comparisonCountyIds.length} 縣市`,
        countyIds: comparisonCountyIds.filter((cid) => summaryDataset.counties.some((c) => c.id === cid)).slice(0, 4),
        activeYear,
        educationLevel,
        managementType,
        region,
      })
    : null
  const favoriteScenarioIds = new Set(favoriteScenarios.map((s) => s.id))
  const topRows = rankingRows.slice(0, 6)
  const topCountyPrefetchIds = selectedCounty ? '' : countyRankingRows.slice(0, 3).map((r) => r.id).join('|')
  const countyQuickPicks = countySummaries
    .filter((c) => !c.filteredOut)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))

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
    .filter((c) =>
      loadObservation.loadedCountyDetails.includes(c.id) ||
      loadObservation.loadedBucketSlices.includes(c.id) ||
      loadObservation.loadedTownshipSlices.includes(c.id),
    )
    .map((c) => ({
      id: c.id,
      name: c.name,
      detailBytes: loadObservation.resourceSizes[c.detailFile] ?? c.assetMetrics?.detailBytes ?? 0,
      bucketBytes: loadObservation.resourceSizes[c.bucketFile] ?? c.assetMetrics?.bucketBytes ?? 0,
      townshipBytes: loadObservation.resourceSizes[c.townshipFile] ?? c.assetMetrics?.townshipBytes ?? 0,
      hasBucketSlice: loadObservation.loadedBucketSlices.includes(c.id),
      hasTownshipSlice: loadObservation.loadedTownshipSlices.includes(c.id),
    }))

  const schoolRecordLookup = new Map(
    (selectedCountyDetail?.towns ?? []).flatMap((township) => township.schools.map((school) => [school.id, school] as const)),
  )
  const schoolMapPoints: SchoolMapPoint[] = schoolInsights.reduce<SchoolMapPoint[]>((points, school) => {
    const rawSchool = schoolRecordLookup.get(school.id)
    if (!rawSchool) return points
    const { latitude, longitude } = rawSchool.coordinates
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return points
    points.push({
      id: school.id,
      name: school.name,
      townshipName: school.townshipName,
      educationLevel: school.educationLevel as SchoolLevel,
      managementType: school.managementType as SchoolManagementType,
      status: school.status ?? '正常',
      currentStudents: school.currentStudents,
      delta: school.delta,
      latitude,
      longitude,
      website: rawSchool.profileUrl ?? rawSchool.website,
    })
    return points
  }, [])

  // ── Handlers ──
  const handleCountySelect = (countyId: string) => {
    startTransition(() => {
      setSelectedCountyId(countyId)
      setSelectedTownshipId(null)
      setSelectedSchoolId(null)
      clearCountyDetailError()
    })
  }

  const handleTownshipSelect = (townshipId: string) => {
    startTransition(() => {
      setSelectedTownshipId(townshipId)
      setSelectedSchoolId(null)
    })
  }

  const handleResetScope = () => {
    startTransition(() => {
      setSelectedCountyId(null)
      setSelectedTownshipId(null)
      setSelectedSchoolId(null)
      clearCountyDetailError()
    })
  }

  const handlePrefetchCounty = (countyId: string | null) => {
    if (!selectedCounty && countyId) prefetchCounty(countyId)
  }

  const pushRecentScenario = (countyIds: string[], scenarioName: string) => {
    const scenarioSnapshot = createSavedComparisonScenario({
      name: scenarioName.trim() || `比較 ${countyIds.length} 縣市`,
      countyIds: countyIds.filter((cid) => summaryDataset.counties.some((c) => c.id === cid)).slice(0, 4),
      activeYear,
      educationLevel,
      managementType,
      region,
    })
    if (scenarioSnapshot.countyIds.length === 0) return
    setRecentScenarios((current) => {
      const next = [scenarioSnapshot, ...current.filter((s) => s.id !== scenarioSnapshot.id)].slice(0, 6)
      writeStoredScenarios(COMPARISON_RECENTS_STORAGE_KEY, next)
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
    pushRecentScenario(scenario.countyIds, scenario.name)
    startTransition(() => {
      setComparisonScenarioName(scenario.name)
      setComparisonCountyIds(scenario.countyIds.filter((cid) => summaryDataset.counties.some((c) => c.id === cid)).slice(0, 4))
      setActiveYear(summaryDataset.years.includes(scenario.activeYear) ? scenario.activeYear : (summaryDataset.years.at(-1) ?? DEFAULT_YEAR))
      setEducationLevel(EDUCATION_LEVELS.includes(scenario.educationLevel) ? scenario.educationLevel : '全部')
      setManagementType(MANAGEMENT_TYPES.includes(scenario.managementType) ? scenario.managementType : '全部')
      setRegion(REGION_GROUPS.includes(scenario.region) ? scenario.region : '全部')
      setSelectedCountyId(null)
      setSelectedTownshipId(null)
      setSelectedSchoolId(null)
    })
    scenarioFeedback.show(`已套用情境：${scenario.name}`)
  }

  const handleSaveFavoriteScenario = () => {
    if (!activeScenarioSnapshot) {
      scenarioFeedback.show('目前沒有可收藏的比較情境')
      return
    }
    pushRecentScenario(activeScenarioSnapshot.countyIds, activeScenarioSnapshot.name)
    setFavoriteScenarios((current) => {
      const next = [activeScenarioSnapshot, ...current.filter((s) => s.id !== activeScenarioSnapshot.id)].slice(0, 8)
      writeStoredScenarios(COMPARISON_FAVORITES_STORAGE_KEY, next)
      return next
    })
    scenarioFeedback.show(`已收藏情境：${activeScenarioSnapshot.name}`)
  }

  const handleRemoveFavoriteScenario = (scenarioId: string) => {
    setFavoriteScenarios((current) => {
      const next = current.filter((s) => s.id !== scenarioId)
      writeStoredScenarios(COMPARISON_FAVORITES_STORAGE_KEY, next)
      return next
    })
  }

  const handleRenameFavoriteScenario = (scenarioId: string) => {
    const nextName = window.prompt('輸入新的情境名稱')?.trim()
    if (!nextName) return
    setFavoriteScenarios((current) => {
      const next = current.map((s) =>
        s.id !== scenarioId ? s : createSavedComparisonScenario({ name: nextName, countyIds: s.countyIds, activeYear: s.activeYear, educationLevel: s.educationLevel, managementType: s.managementType, region: s.region, pinned: s.pinned }),
      )
      writeStoredScenarios(COMPARISON_FAVORITES_STORAGE_KEY, next)
      return next
    })
    scenarioFeedback.show(`已重新命名情境：${nextName}`)
  }

  const handleTogglePinScenario = (scenarioId: string) => {
    setFavoriteScenarios((current) => {
      const next = current
        .map((s) => s.id === scenarioId ? { ...s, pinned: !s.pinned, updatedAt: new Date().toISOString() } : s)
        .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
      writeStoredScenarios(COMPARISON_FAVORITES_STORAGE_KEY, next)
      return next
    })
  }

  const handleExportFavoriteScenarios = () => {
    if (favoriteScenarios.length === 0) {
      scenarioFeedback.show('目前沒有可匯出的收藏情境')
      return
    }
    downloadJsonFile('atlas-comparison-scenarios.json', favoriteScenarios)
    scenarioFeedback.show('已匯出收藏情境 JSON')
  }

  const handleImportFavoriteScenarios = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const imported = readStoredScenariosFromText(text)
      if (imported.length === 0) {
        scenarioFeedback.show('匯入檔案沒有有效情境')
        return
      }
      setFavoriteScenarios((current) => {
        const scenarioMap = new Map<string, SavedComparisonScenario>()
        ;[...imported, ...current].forEach((s) => { if (!scenarioMap.has(s.id)) scenarioMap.set(s.id, s) })
        const next = [...scenarioMap.values()]
          .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
          .slice(0, 16)
        writeStoredScenarios(COMPARISON_FAVORITES_STORAGE_KEY, next)
        return next
      })
      scenarioFeedback.show(`已匯入 ${imported.length} 筆情境`)
    } catch {
      scenarioFeedback.show('無法解析情境 JSON')
    }
  }

  const handleDownloadInvestigation = (item: { seriesRows: { year: number; students: number; schools?: number; flags?: string[] }[]; downloadName: string }) => {
    const hasSchools = item.seriesRows.some((r) => r.schools != null)
    const hasFlags = item.seriesRows.some((r) => (r.flags?.length ?? 0) > 0)
    const header = ['year', 'students', ...(hasSchools ? ['schools'] : []), ...(hasFlags ? ['flags'] : [])]
    const rows = item.seriesRows.map((r) => [
      String(r.year),
      String(r.students),
      ...(hasSchools ? [String(r.schools ?? '')] : []),
      ...(hasFlags ? [r.flags?.join('|') ?? ''] : []),
    ])
    downloadCsvFile(item.downloadName, [header, ...rows])
  }

  const handleDownloadAllInvestigations = () => {
    if (filteredAnomalies.length === 0) {
      scenarioFeedback.show('目前沒有可匯出的異常序列')
      return
    }
    const rows = filteredAnomalies.flatMap((item) =>
      item.seriesRows.map((r) => [
        item.scope, item.title, classifyInvestigation(item), item.severity, item.meta,
        String(r.year), String(r.students), String(r.schools ?? ''), r.flags?.join('|') ?? '',
      ]),
    )
    downloadCsvFile(`${scopeHeadline}-異常序列整批匯出.csv`, [
      ['scope', 'title', 'filter', 'severity', 'meta', 'year', 'students', 'schools', 'flags'],
      ...rows,
    ])
  }

  const TAB_ITEMS: { key: AtlasTab; label: string; badge?: string }[] = [
    { key: 'overview', label: '概況總覽' },
    { key: 'regional', label: '區域分析', badge: comparisonCountyIds.length > 0 ? `${effectiveComparisonCountyIds.length}` : undefined },
    { key: 'schools', label: '學校工作台', badge: schoolInsights.length > 0 ? `${schoolInsights.length}` : undefined },
  ]

  return (
    <div className="app-shell" data-testid="atlas-app">
      <header className="atlas-topbar">
        <div className="atlas-topbar__intro panel">
          <div>
            <p className="eyebrow">Taiwan Education Atlas</p>
            <h1>台灣學生數地圖工作台</h1>
          </div>
          <p>以 Leaflet 地圖作為主舞台，將篩選條件放到上方，把比較、異常調查、排行與學校表格收斂到左側分析工作台。</p>
        </div>

        <div className={isOffline ? 'atlas-status atlas-status--offline' : 'atlas-status'}>
          <strong>{isOffline ? '離線首頁模式' : '快取可用模式'}</strong>
          <span>
            {isOffline
              ? `已啟用最近一次快取摘要，可離線查看 ${offlineReadyWithBuckets} 份地方切片與全台摘要。`
              : `目前已快取 ${offlineReadyWithBuckets} 份地方切片，累積傳輸 ${formatFileSize(loadObservation.totalTransferredBytes)}。`}
          </span>
        </div>

        <FilterBar
          years={summaryDataset.years}
          activeYear={activeYear}
          educationLevel={educationLevel}
          managementType={managementType}
          region={region}
          searchText={searchText}
          isYearPlaybackActive={isYearPlaybackActive}
          isPending={isPending}
          countyQuickPicks={countyQuickPicks}
          activeCountyId={activeCountyId}
          onSetActiveYear={setActiveYear}
          onSetEducationLevel={setEducationLevel}
          onSetManagementType={setManagementType}
          onSetRegion={setRegion}
          onSetSearchText={setSearchText}
          onSetIsYearPlaybackActive={setIsYearPlaybackActive}
          onResetScope={handleResetScope}
          onSelectCounty={handleCountySelect}
          onPrefetchCounty={handlePrefetchCounty}
          startTransition={startTransition}
        />
      </header>

      <div className="atlas-workbench">
        <main className="atlas-analysis-column">
          {/* ── Tab bar ── */}
          <nav className="atlas-tabs" role="tablist">
            {TAB_ITEMS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                type="button"
                aria-selected={activeTab === tab.key}
                className={activeTab === tab.key ? 'atlas-tab atlas-tab--active' : 'atlas-tab'}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {tab.badge ? <span className="atlas-tab__badge">{tab.badge}</span> : null}
              </button>
            ))}
          </nav>

          {/* ── Tab: 概況總覽 ── */}
          {activeTab === 'overview' && (
            <div className="atlas-tab-panel">
              <ScopePanel
                scopePath={scopePath}
                scopeHeadline={scopeHeadline}
                scopeDescription={scopeDescription}
                currentScope={currentScope}
                activeYear={activeYear}
                isYearPlaybackActive={isYearPlaybackActive}
                educationDistribution={educationDistribution}
                observedCounties={observedCounties}
                topCountyPrefetchIds={topCountyPrefetchIds}
                loadObservation={loadObservation}
                offlineReadyWithBuckets={offlineReadyWithBuckets}
                onPrefetchAll={prefetchAllCounties}
              />

              <InsightPanel
                title={selectedCounty ? `${selectedCounty.name} 鄉鎮排行` : '全台縣市排行'}
                subtitle={selectedCounty ? '點擊鄉鎮即可同步切換表格與單校焦點' : '點擊縣市可載入地方細節與鄉鎮界線'}
                rows={topRows}
                activeRowId={activeTownshipId ?? activeCountyId}
                onSelectRow={(rowId) => {
                  if (selectedCounty) {
                    handleTownshipSelect(rowId)
                  } else {
                    handleCountySelect(rowId)
                  }
                }}
                onHoverRow={(rowId) => {
                  if (!selectedCounty && rowId) handlePrefetchCounty(rowId)
                }}
                emptyMessage="目前條件沒有可顯示的排行資料。"
              />
            </div>
          )}

          {/* ── Tab: 區域分析 ── */}
          {activeTab === 'regional' && (
            <div className="atlas-tab-panel">
              <ComparisonPanel
                comparisonScenarioName={comparisonScenarioName}
                onChangeScenarioName={setComparisonScenarioName}
                effectiveComparisonCountyIds={effectiveComparisonCountyIds}
                comparisonCandidates={comparisonCandidates}
                comparisonSummaries={comparisonSummaries}
                favoriteScenarios={favoriteScenarios}
                recentScenarios={recentScenarios}
                activeScenarioSnapshot={activeScenarioSnapshot}
                favoriteScenarioIds={favoriteScenarioIds}
                copyFeedback={copyFeedback.message}
                scenarioFeedback={scenarioFeedback.message}
                onToggleCounty={toggleComparisonCounty}
                onCopyLink={handleCopyComparisonLink}
                onSaveScenario={handleSaveFavoriteScenario}
                onExportScenarios={handleExportFavoriteScenarios}
                onImportScenarios={handleImportFavoriteScenarios}
                onApplyScenario={applySavedScenario}
                onTogglePinScenario={handleTogglePinScenario}
                onRenameScenario={handleRenameFavoriteScenario}
                onRemoveScenario={handleRemoveFavoriteScenario}
              />

              <AnomalyPanel
                filteredAnomalies={filteredAnomalies}
                activeInvestigation={activeInvestigation}
                selectedInvestigationId={selectedInvestigationId}
                investigationFilter={investigationFilter}
                scopeNotes={scopeNotes}
                scopeHeadline={scopeHeadline}
                onSelectInvestigation={setSelectedInvestigationId}
                onSetFilter={setInvestigationFilter}
                onDownloadInvestigation={handleDownloadInvestigation}
                onDownloadAll={handleDownloadAllInvestigations}
              />
            </div>
          )}

          {/* ── Tab: 學校工作台 ── */}
          {activeTab === 'schools' && (
            <div className="atlas-tab-panel">
              <SchoolDetailPanel
                selectedCountyName={selectedCounty?.name ?? null}
                countyDetailError={countyDetailError}
                isCountyDetailLoading={isCountyDetailLoading}
                schoolInsights={schoolInsights}
                selectedSchool={selectedSchool}
                schoolPanelTitle={schoolPanelTitle}
                activeYear={activeYear}
                selectedTownshipSummary={selectedTownshipSummary}
                selectedCountySummary={selectedCountySummary}
                onSelectSchool={setSelectedSchoolId}
              />
            </div>
          )}
        </main>

        <aside className="atlas-map-column">
          <TaiwanExplorerMap
            counties={countySummaries}
            activeCountyId={activeCountyId}
            activeTownshipId={activeTownshipId}
            countyBoundaries={countyBoundaries}
            townshipBoundaries={activeTownshipBoundaries}
            townshipRows={townshipRows}
            schoolPoints={schoolMapPoints}
            countyBuckets={activeCountyBuckets}
            selectedSchoolId={selectedSchool?.id ?? null}
            isTownshipBoundaryLoading={isTownshipBoundaryLoading}
            onSelectCounty={handleCountySelect}
            onSelectTownship={handleTownshipSelect}
            onSelectSchool={setSelectedSchoolId}
            onResetScope={handleResetScope}
            onHoverCounty={handlePrefetchCounty}
            loadObservation={loadObservation}
            observedCounties={observedCounties}
          />
        </aside>
      </div>

      <footer className="footer-note footer-note--official">
        <span>正式資料來源: 教育部統計處校別資料、教育 GIS 點位、內政部國土測繪中心行政區界線。</span>
        <span>資料產製時間: {generatedAtLabel}</span>
      </footer>
    </div>
  )
}

export default App
