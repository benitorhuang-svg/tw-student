import { useDeferredValue, useEffect, useState, useTransition, type ChangeEvent } from 'react'

import './App.css'

import InsightPanel from './components/InsightPanel'
import SchoolDataTable from './components/SchoolDataTable'
import StatCard from './components/StatCard'
import TaiwanExplorerMap, { type SchoolMapPoint } from './components/TaiwanExplorerMap'
import TrendChart from './components/TrendChart'
import {
  ACADEMIC_YEARS,
  EDUCATION_LEVELS,
  MANAGEMENT_TYPES,
  REGION_GROUPS,
  buildSummaryBucketKey,
  getAtlasLoadObservations,
  loadCountyBuckets,
  loadCountyBoundaries,
  loadCountyDetail,
  loadEducationSummary,
  loadTownshipBoundaries,
  prefetchCountyResources,
  subscribeAtlasLoadObservations,
  type AcademicYear,
  type AtlasLoadObservationSnapshot,
  type CountyBucketDataset,
  type CountyBoundaryCollection,
  type CountyDetailDataset,
  type DataNote,
  type EducationLevelFilter,
  type EducationSummaryDataset,
  type ManagementTypeFilter,
  type RegionGroupFilter,
  type SchoolLevel,
  type SchoolManagementType,
  type SummaryTrendRecord,
  type TownshipBoundaryCollection,
} from './data/educationData'
import {
  formatAcademicYear,
  formatDelta,
  formatFileSize,
  formatPercent,
  formatStudents,
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
  type CountySummary,
} from './lib/analytics'

const DEFAULT_YEAR = ACADEMIC_YEARS.at(-1) ?? 113
const COMPARISON_FAVORITES_STORAGE_KEY = 'tw-atlas-comparison-favorites'
const COMPARISON_RECENTS_STORAGE_KEY = 'tw-atlas-comparison-recents'

type InvestigationSeriesRow = {
  year: number
  students: number
  schools?: number
  flags?: string[]
}

type InvestigationItem = {
  id: string
  scope: string
  title: string
  detail: string
  meta: string
  severity: DataNote['severity']
  seriesRows: InvestigationSeriesRow[]
  downloadName: string
}

type SavedComparisonScenario = {
  id: string
  name: string
  countyIds: string[]
  activeYear: AcademicYear
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  region: RegionGroupFilter
  pinned?: boolean
  updatedAt: string
}

type InvestigationFilter = '全部' | '缺年度' | '待確認' | '停辦/整併' | '正式註記'

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
    comparisonCountyIds: compare ? compare.split(',').map((value) => value.trim()).filter(Boolean) : [],
    comparisonScenarioName: params.get('scenario') ?? '',
  }
}

function severityRank(severity: DataNote['severity']) {
  switch (severity) {
    case 'critical':
      return 3
    case 'warning':
      return 2
    default:
      return 1
  }
}

function buildSummarySeriesRows(summarySeries: SummaryTrendRecord[]) {
  return summarySeries.map((entry) => ({
    year: entry.year,
    students: entry.students,
    schools: entry.schools,
  }))
}

function resolveSummarySeries(
  summaries: Record<string, SummaryTrendRecord[]>,
  educationLevel: EducationLevelFilter,
  managementType: ManagementTypeFilter,
) {
  return (
    summaries[buildSummaryBucketKey(educationLevel, managementType)] ??
    summaries[buildSummaryBucketKey('全部', '全部')] ??
    []
  )
}

function downloadCsvFile(fileName: string, rows: string[][]) {
  const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`
  const csv = rows.map((row) => row.map((value) => escapeCsv(value)).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

function readStoredScenarios(storageKey: string) {
  if (typeof window === 'undefined') {
    return [] as SavedComparisonScenario[]
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey)
    if (!rawValue) {
      return [] as SavedComparisonScenario[]
    }

    const parsed = JSON.parse(rawValue)
    if (!Array.isArray(parsed)) {
      return [] as SavedComparisonScenario[]
    }

    return parsed.filter((item): item is SavedComparisonScenario => {
      return (
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        Array.isArray(item.countyIds) &&
        typeof item.activeYear === 'number' &&
        typeof item.educationLevel === 'string' &&
        typeof item.managementType === 'string' &&
        typeof item.region === 'string' &&
        typeof item.updatedAt === 'string'
      )
    })
  } catch {
    return [] as SavedComparisonScenario[]
  }
}

function writeStoredScenarios(storageKey: string, scenarios: SavedComparisonScenario[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(storageKey, JSON.stringify(scenarios))
}

function readStoredScenariosFromText(rawValue: string) {
  try {
    const parsed = JSON.parse(rawValue)
    if (!Array.isArray(parsed)) {
      return [] as SavedComparisonScenario[]
    }

    return parsed.filter((item): item is SavedComparisonScenario => {
      return (
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        Array.isArray(item.countyIds) &&
        typeof item.activeYear === 'number' &&
        typeof item.educationLevel === 'string' &&
        typeof item.managementType === 'string' &&
        typeof item.region === 'string' &&
        typeof item.updatedAt === 'string'
      )
    })
  } catch {
    return [] as SavedComparisonScenario[]
  }
}

function buildComparisonScenarioId(scenario: Omit<SavedComparisonScenario, 'id' | 'updatedAt'>) {
  return [
    scenario.name.trim() || 'scenario',
    scenario.countyIds.join(','),
    scenario.activeYear,
    scenario.educationLevel,
    scenario.managementType,
    scenario.region,
  ].join('__')
}

function createSavedComparisonScenario(scenario: Omit<SavedComparisonScenario, 'id' | 'updatedAt'>): SavedComparisonScenario {
  return {
    ...scenario,
    id: buildComparisonScenarioId(scenario),
    updatedAt: new Date().toISOString(),
  }
}

function downloadJsonFile(fileName: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

function classifyInvestigation(item: InvestigationItem): InvestigationFilter {
  if (item.title.includes('缺年度')) {
    return '缺年度'
  }
  if (item.title.includes('待確認')) {
    return '待確認'
  }
  if (item.title.includes('停辦') || item.title.includes('整併')) {
    return '停辦/整併'
  }
  return '正式註記'
}

function buildInvestigationItems({
  summaryDataset,
  countySummaries,
  countyRankingRows,
  selectedCounty,
  selectedCountyDetail,
  selectedTownshipId,
  selectedTownshipSummary,
  scopeNotes,
  filters,
}: {
  summaryDataset: EducationSummaryDataset
  countySummaries: CountySummary[]
  countyRankingRows: ReturnType<typeof getCountyRankingRows>
  selectedCounty: EducationSummaryDataset['counties'][number] | null
  selectedCountyDetail: CountyDetailDataset | null
  selectedTownshipId: string | null
  selectedTownshipSummary: ReturnType<typeof getTownshipScopeSummaryFromSummary>
  scopeNotes: DataNote[]
  filters: {
    educationLevel: EducationLevelFilter
    managementType: ManagementTypeFilter
  }
}) {
  const items = new Map<string, InvestigationItem>()

  const register = (item: InvestigationItem) => {
    if (!items.has(item.id) && item.seriesRows.length > 0) {
      items.set(item.id, item)
    }
  }

  scopeNotes.forEach((note, index) => {
    if (selectedTownshipSummary && selectedCounty && selectedTownshipId) {
      const townshipRecord = selectedCounty.towns.find((township) => township.id === selectedTownshipId)
      const seriesRows = townshipRecord
        ? buildSummarySeriesRows(resolveSummarySeries(townshipRecord.summaries, filters.educationLevel, filters.managementType))
        : []

      register({
        id: `scope-town-${selectedTownshipSummary.label}-${note.type}-${index}`,
        scope: '鄉鎮',
        title: `${selectedTownshipSummary.label} / ${note.type}`,
        detail: note.message,
        meta: note.years?.length ? `涉及年度: ${note.years.join('、')}` : selectedCounty.name,
        severity: note.severity,
        seriesRows,
        downloadName: `${selectedTownshipSummary.label}-${note.type}-原始序列.csv`,
      })
      return
    }

    if (selectedCounty) {
      register({
        id: `scope-county-${selectedCounty.name}-${note.type}-${index}`,
        scope: '縣市',
        title: `${selectedCounty.name} / ${note.type}`,
        detail: note.message,
        meta: note.years?.length ? `涉及年度: ${note.years.join('、')}` : selectedCounty.region,
        severity: note.severity,
        seriesRows: buildSummarySeriesRows(resolveSummarySeries(selectedCounty.summaries, filters.educationLevel, filters.managementType)),
        downloadName: `${selectedCounty.name}-${note.type}-原始序列.csv`,
      })
    }
  })

  if (!selectedCounty) {
    countyRankingRows.slice(0, 4).forEach((row) => {
      const county = summaryDataset.counties.find((entry) => entry.id === row.id)
      const countySummary = countySummaries.find((entry) => entry.id === row.id)
      county?.dataNotes?.forEach((note, index) => {
        register({
          id: `county-${county.id}-${note.type}-${index}`,
          scope: '縣市',
          title: `${county.name} / ${note.type}`,
          detail: note.message,
          meta: `${county.region} | ${formatStudents(countySummary?.students ?? row.students)} 人`,
          severity: note.severity,
          seriesRows: buildSummarySeriesRows(resolveSummarySeries(county.summaries, filters.educationLevel, filters.managementType)),
          downloadName: `${county.name}-${note.type}-原始序列.csv`,
        })
      })
    })
  }

  selectedCountyDetail?.towns.forEach((township) => {
    const townshipSummaryRecord = selectedCounty?.towns.find((item) => item.id === township.id)
    const townshipSeriesRows = townshipSummaryRecord
      ? buildSummarySeriesRows(resolveSummarySeries(townshipSummaryRecord.summaries, filters.educationLevel, filters.managementType))
      : []

    township.dataNotes?.forEach((note, index) => {
      register({
        id: `town-${township.id}-${note.type}-${index}`,
        scope: '鄉鎮',
        title: `${township.name} / ${note.type}`,
        detail: note.message,
        meta: selectedCountyDetail.county.name,
        severity: note.severity,
        seriesRows: townshipSeriesRows,
        downloadName: `${township.name}-${note.type}-原始序列.csv`,
      })
    })

    township.schools.forEach((school) => {
      const schoolSeriesRows = school.yearlyStudents.map((entry) => ({
        year: entry.year,
        students: entry.students,
        flags: [
          ...(entry.isMissing ? ['缺值'] : []),
          ...(entry.isEstimated ? ['估算'] : []),
          ...(school.missingYears?.includes(entry.year) ? ['列於 missingYears'] : []),
        ],
      }))

      if (school.status && school.status !== '正常') {
        register({
          id: `status-${school.id}-${school.status}`,
          scope: '學校',
          title: `${school.name} / ${school.status}`,
          detail: school.status === '待確認' ? '此校狀態仍待人工確認。' : '此校在正式資料中被標記為非一般持續營運狀態。',
          meta: `${township.name} | ${school.educationLevel}`,
          severity: school.status === '待確認' ? 'critical' : 'warning',
          seriesRows: schoolSeriesRows,
          downloadName: `${school.name}-${school.status}-原始序列.csv`,
        })
      }

      if (school.missingYears && school.missingYears.length > 0) {
        register({
          id: `missing-${school.id}`,
          scope: '學校',
          title: `${school.name} / 缺年度`,
          detail: `缺少 ${school.missingYears.join('、')} 學年的正式學生數紀錄。`,
          meta: `${township.name} | ${school.educationLevel}`,
          severity: 'warning',
          seriesRows: schoolSeriesRows,
          downloadName: `${school.name}-缺年度-原始序列.csv`,
        })
      }

      school.dataNotes?.forEach((note, index) => {
        register({
          id: `school-note-${school.id}-${note.type}-${index}`,
          scope: '學校',
          title: `${school.name} / ${note.type}`,
          detail: note.message,
          meta: `${township.name} | ${school.educationLevel}`,
          severity: note.severity,
          seriesRows: schoolSeriesRows,
          downloadName: `${school.name}-${note.type}-原始序列.csv`,
        })
      })
    })
  })

  return [...items.values()]
    .sort((left, right) => severityRank(right.severity) - severityRank(left.severity))
    .slice(0, 12)
}

function App() {
  const initialQueryState = readInitialQueryState()
  const [summaryDataset, setSummaryDataset] = useState<EducationSummaryDataset | null>(null)
  const [countyBoundaries, setCountyBoundaries] = useState<CountyBoundaryCollection | null>(null)
  const [countyDetailCache, setCountyDetailCache] = useState<Record<string, CountyDetailDataset>>({})
  const [countyBucketCache, setCountyBucketCache] = useState<Record<string, CountyBucketDataset>>({})
  const [townshipBoundaryCache, setTownshipBoundaryCache] = useState<Record<string, TownshipBoundaryCollection>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [countyDetailError, setCountyDetailError] = useState<string | null>(null)
  const [activeYear, setActiveYear] = useState<AcademicYear>(initialQueryState.activeYear)
  const [educationLevel, setEducationLevel] = useState<EducationLevelFilter>(initialQueryState.educationLevel)
  const [managementType, setManagementType] = useState<ManagementTypeFilter>(initialQueryState.managementType)
  const [region, setRegion] = useState<RegionGroupFilter>(initialQueryState.region)
  const [searchText, setSearchText] = useState(initialQueryState.searchText)
  const [selectedCountyId, setSelectedCountyId] = useState<string | null>(initialQueryState.selectedCountyId)
  const [selectedTownshipId, setSelectedTownshipId] = useState<string | null>(initialQueryState.selectedTownshipId)
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null)
  const [comparisonCountyIds, setComparisonCountyIds] = useState<string[]>(initialQueryState.comparisonCountyIds)
  const [comparisonScenarioName, setComparisonScenarioName] = useState(initialQueryState.comparisonScenarioName)
  const [favoriteScenarios, setFavoriteScenarios] = useState<SavedComparisonScenario[]>(() => readStoredScenarios(COMPARISON_FAVORITES_STORAGE_KEY))
  const [recentScenarios, setRecentScenarios] = useState<SavedComparisonScenario[]>(() => readStoredScenarios(COMPARISON_RECENTS_STORAGE_KEY))
  const [selectedInvestigationId, setSelectedInvestigationId] = useState<string | null>(null)
  const [investigationFilter, setInvestigationFilter] = useState<InvestigationFilter>('全部')
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const [scenarioFeedback, setScenarioFeedback] = useState<string | null>(null)
  const [isYearPlaybackActive, setIsYearPlaybackActive] = useState(false)
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false)
  const [loadObservation, setLoadObservation] = useState<AtlasLoadObservationSnapshot>(getAtlasLoadObservations())
  const [isPending, startTransition] = useTransition()
  const deferredSearchText = useDeferredValue(searchText)
  const selectedCountyForQuery = summaryDataset?.counties.find((county) => county.id === selectedCountyId) ?? null

  useEffect(() => subscribeAtlasLoadObservations(setLoadObservation), [])

  useEffect(() => {
    const updateOfflineState = () => setIsOffline(!navigator.onLine)

    window.addEventListener('online', updateOfflineState)
    window.addEventListener('offline', updateOfflineState)

    return () => {
      window.removeEventListener('online', updateOfflineState)
      window.removeEventListener('offline', updateOfflineState)
    }
  }, [])

  useEffect(() => {
    Promise.all([loadEducationSummary(), loadCountyBoundaries()])
      .then(([nextSummaryDataset, nextCountyBoundaries]) => {
        setSummaryDataset(nextSummaryDataset)
        setCountyBoundaries(nextCountyBoundaries)
      })
      .catch((error: Error) => {
        setLoadError(error.message)
      })
  }, [])

  useEffect(() => {
    if (!summaryDataset || !selectedCountyId || countyDetailCache[selectedCountyId]) {
      return
    }

    const selectedCounty = summaryDataset.counties.find((county) => county.id === selectedCountyId)
    if (!selectedCounty) {
      return
    }

    loadCountyDetail(selectedCounty.detailFile, selectedCounty.id)
      .then((detail) => {
        setCountyDetailCache((current) => ({
          ...current,
          [selectedCountyId]: detail,
        }))
      })
      .catch((error: Error) => {
        setCountyDetailError(error.message)
      })
  }, [countyDetailCache, selectedCountyId, summaryDataset])

  useEffect(() => {
    if (!summaryDataset || !selectedCountyId || townshipBoundaryCache[selectedCountyId]) {
      return
    }

    if (!selectedCountyForQuery) {
      return
    }

    loadTownshipBoundaries(selectedCountyId, selectedCountyForQuery.townshipFile)
      .then((boundaries) => {
        setTownshipBoundaryCache((current) => ({
          ...current,
          [selectedCountyId]: boundaries,
        }))
      })
      .catch((error: Error) => {
        setLoadError(error.message)
      })
  }, [selectedCountyForQuery, selectedCountyId, summaryDataset, townshipBoundaryCache])

  useEffect(() => {
    if (!summaryDataset || !selectedCountyId || countyBucketCache[selectedCountyId]) {
      return
    }

    if (!selectedCountyForQuery) {
      return
    }

    loadCountyBuckets(selectedCountyForQuery.bucketFile, selectedCountyForQuery.id)
      .then((bucketSlice) => {
        setCountyBucketCache((current) => ({
          ...current,
          [selectedCountyId]: bucketSlice,
        }))
      })
      .catch((error: Error) => {
        setLoadError(error.message)
      })
  }, [countyBucketCache, selectedCountyForQuery, selectedCountyId, summaryDataset])

  useEffect(() => {
    if (!summaryDataset) {
      return
    }

    const params = new URLSearchParams()
    params.set('year', String(summaryDataset.years.includes(activeYear) ? activeYear : summaryDataset.years.at(-1) ?? activeYear))

    if (educationLevel !== '全部') {
      params.set('level', educationLevel)
    }

    if (managementType !== '全部') {
      params.set('management', managementType)
    }

    if (region !== '全部') {
      params.set('region', region)
    }

    if (deferredSearchText.trim()) {
      params.set('search', deferredSearchText.trim())
    }

    const cleanedComparisonIds = comparisonCountyIds.filter((countyId) => summaryDataset.counties.some((county) => county.id === countyId))
    if (cleanedComparisonIds.length > 0) {
      params.set('compare', cleanedComparisonIds.join(','))
    }

    if (comparisonScenarioName.trim()) {
      params.set('scenario', comparisonScenarioName.trim())
    }

    const countyIdForUrl = summaryDataset.counties.some((county) => county.id === selectedCountyId) ? selectedCountyId : null
    if (countyIdForUrl) {
      params.set('county', countyIdForUrl)
    }

    const townshipIdForUrl = countyIdForUrl
      ? summaryDataset.counties.find((county) => county.id === countyIdForUrl)?.towns.some((township) => township.id === selectedTownshipId)
        ? selectedTownshipId
        : null
      : null
    if (townshipIdForUrl) {
      params.set('township', townshipIdForUrl)
    }

    const nextSearch = params.toString()
    const nextUrl = nextSearch ? `${window.location.pathname}?${nextSearch}` : window.location.pathname
    window.history.replaceState({}, '', nextUrl)
  }, [activeYear, comparisonCountyIds, comparisonScenarioName, deferredSearchText, educationLevel, managementType, region, selectedCountyId, selectedTownshipId, summaryDataset])

  useEffect(() => {
    if (!summaryDataset || selectedCountyId) {
      return
    }

    const prefetchFilters = {
      year: summaryDataset.years.includes(activeYear) ? activeYear : (summaryDataset.years.at(-1) ?? DEFAULT_YEAR),
      educationLevel,
      managementType,
      region,
      searchText: deferredSearchText,
    }

    const topCounties = getCountyRankingRows(getCountySummaries(summaryDataset.counties, prefetchFilters)).slice(0, 3)
    topCounties
      .map((row) => summaryDataset.counties.find((county) => county.id === row.id))
      .filter((county): county is EducationSummaryDataset['counties'][number] => Boolean(county))
      .forEach((county) => {
        void prefetchCountyResources(county, { includeTownshipSlice: true, includeBucketSlice: true })
      })
  }, [activeYear, deferredSearchText, educationLevel, managementType, region, selectedCountyId, summaryDataset])

  useEffect(() => {
    if (!summaryDataset || !isYearPlaybackActive || summaryDataset.years.length <= 1) {
      return
    }

    const timer = window.setInterval(() => {
      startTransition(() => {
        setActiveYear((currentYear) => {
          const currentIndex = summaryDataset.years.indexOf(currentYear)
          const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % summaryDataset.years.length : summaryDataset.years.length - 1
          return summaryDataset.years[nextIndex] ?? currentYear
        })
      })
    }, 1800)

    return () => {
      window.clearInterval(timer)
    }
  }, [isYearPlaybackActive, startTransition, summaryDataset])

  useEffect(() => {
    if (!copyFeedback) {
      return
    }

    const timer = window.setTimeout(() => {
      setCopyFeedback(null)
    }, 2400)

    return () => {
      window.clearTimeout(timer)
    }
  }, [copyFeedback])

  useEffect(() => {
    if (!scenarioFeedback) {
      return
    }

    const timer = window.setTimeout(() => {
      setScenarioFeedback(null)
    }, 2400)

    return () => {
      window.clearTimeout(timer)
    }
  }, [scenarioFeedback])

  const activeScenarioSnapshot = summaryDataset && comparisonCountyIds.length > 0
    ? createSavedComparisonScenario({
        name: comparisonScenarioName.trim() || `比較 ${comparisonCountyIds.length} 縣市`,
        countyIds: comparisonCountyIds.filter((countyId) => summaryDataset.counties.some((county) => county.id === countyId)).slice(0, 4),
        activeYear,
        educationLevel,
        managementType,
        region,
      })
    : null

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

  const filters = {
    year: summaryDataset.years.includes(activeYear) ? activeYear : (summaryDataset.years.at(-1) ?? DEFAULT_YEAR),
    educationLevel,
    managementType,
    region,
    searchText: deferredSearchText,
  }

  const selectedCountyFromDataset = summaryDataset.counties.find((county) => county.id === selectedCountyId) ?? null
  const countySummaries = getCountySummaries(summaryDataset.counties, filters)
  const countyRankingRows = getCountyRankingRows(countySummaries)
  const activeCountyId = selectedCountyFromDataset && countySummaries.some((county) => county.id === selectedCountyId && !county.filteredOut)
    ? selectedCountyId
    : null
  const activeTownshipBoundaries = activeCountyId ? townshipBoundaryCache[activeCountyId] ?? null : null
  const activeCountyBuckets = activeCountyId ? countyBucketCache[activeCountyId] ?? null : null
  const isTownshipBoundaryLoading = Boolean(activeCountyId && !activeTownshipBoundaries)
  const selectedCounty = summaryDataset.counties.find((county) => county.id === activeCountyId) ?? null
  const selectedCountyDetail = activeCountyId ? countyDetailCache[activeCountyId] ?? null : null
  const isCountyDetailLoading = Boolean(activeCountyId && !selectedCountyDetail && !countyDetailError)
  const selectedCountySummary = selectedCounty ? getCountyScopeSummaryFromSummary(selectedCounty, filters) : null
  const townshipRows = selectedCounty ? getTownshipSummaries(selectedCounty, filters) : []
  const activeTownshipId = selectedCounty && townshipRows.some((township) => township.id === selectedTownshipId) ? selectedTownshipId : null
  const selectedTownshipSummary = selectedCounty && activeTownshipId
    ? getTownshipScopeSummaryFromSummary(selectedCounty, activeTownshipId, filters)
    : null
  const schoolInsights = getSchoolInsights(selectedCountyDetail, filters, activeTownshipId)
  const activeSchoolId = schoolInsights.some((school) => school.id === selectedSchoolId) ? selectedSchoolId : null
  const selectedSchool = schoolInsights.find((school) => school.id === activeSchoolId) ?? schoolInsights.at(0) ?? null
  const nationalSummary = getNationSummary(summaryDataset.counties, filters)
  const educationDistribution = getNationalEducationDistribution(summaryDataset.counties, filters)
  const currentScope = selectedTownshipSummary ?? selectedCountySummary ?? nationalSummary
  const rankingRows = selectedCounty ? townshipRows : countyRankingRows
  const scopeNotes = selectedTownshipSummary && selectedCounty && activeTownshipId
    ? getTownshipNotesFromSummary(selectedCounty, activeTownshipId)
    : selectedCounty
      ? getCountyNotesFromSummary(selectedCounty)
      : []
  const scopePath = ['全台灣']

  if (selectedCountySummary) {
    scopePath.push(selectedCountySummary.label)
  }

  if (selectedTownshipSummary) {
    scopePath.push(selectedTownshipSummary.label)
  }

  const validComparisonIds = comparisonCountyIds.filter((countyId) => summaryDataset.counties.some((county) => county.id === countyId))
  const effectiveComparisonCountyIds = (validComparisonIds.length > 0 ? validComparisonIds : countyRankingRows.map((row) => row.id).slice(0, 4)).slice(0, 4)
  const comparisonSummaries = getCountyComparisonSummaries(summaryDataset.counties, effectiveComparisonCountyIds, filters)
  const comparisonCandidateIds = [...new Set([...effectiveComparisonCountyIds, ...countyRankingRows.slice(0, 8).map((row) => row.id)])]
  const comparisonCandidates = comparisonCandidateIds
    .map((countyId) => {
      const rankingRow = countyRankingRows.find((row) => row.id === countyId)
      const summaryRow = countySummaries.find((row) => row.id === countyId)

      return {
        id: countyId,
        displayName: summaryRow?.name ?? rankingRow?.label ?? countyId,
      }
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
    filters: {
      educationLevel,
      managementType,
    },
  })
  const filteredAnomalies = anomalies.filter((item) => investigationFilter === '全部' || classifyInvestigation(item) === investigationFilter)
  const activeInvestigation = filteredAnomalies.find((item) => item.id === selectedInvestigationId) ?? filteredAnomalies[0] ?? null
  const favoriteScenarioIds = new Set(favoriteScenarios.map((scenario) => scenario.id))
  const topRows = rankingRows.slice(0, 6)
  const topCountyPrefetchIds = selectedCounty ? '' : countyRankingRows.slice(0, 3).map((row) => row.id).join('|')
  const countyQuickPicks = countySummaries
    .filter((county) => !county.filteredOut)
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hant'))
  const schoolPanelTitle = selectedTownshipSummary
    ? `${selectedTownshipSummary.label} 學校清單`
    : selectedCountySummary
      ? `${selectedCountySummary.label} 重點學校`
      : '縣市細節載入後顯示學校清單'
  const scopeHeadline = selectedTownshipSummary
    ? `${selectedTownshipSummary.label} 校務分布`
    : selectedCountySummary
      ? `${selectedCountySummary.label} 教育版圖`
      : '全台教育工作台'
  const scopeDescription = selectedTownshipSummary
    ? '已切到鄉鎮層級，左側表格與異常面板同步聚焦同一範圍。'
    : selectedCountySummary
      ? '已聚焦指定縣市，右側地圖呈現鄉鎮界線與校點分群，左側同步顯示比較與學校明細。'
      : '上方篩選列負責切片條件，左側分析工作台負責比較、排行與治理，右側專注地圖探索。'
  const generatedAtLabel = new Date(summaryDataset.generatedAt).toLocaleString('zh-TW')
  const offlineReadySlices = loadObservation.loadedCountyDetails.length + loadObservation.loadedTownshipSlices.length
  const offlineReadyWithBuckets = offlineReadySlices + loadObservation.loadedBucketSlices.length

  const observedCounties = summaryDataset.counties
    .filter(
      (county) =>
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
  const schoolMapPoints: SchoolMapPoint[] = schoolInsights.reduce<SchoolMapPoint[]>((points, school) => {
      const rawSchool = schoolRecordLookup.get(school.id)

      if (!rawSchool) {
        return points
      }

      const { latitude, longitude } = rawSchool.coordinates
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return points
      }

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

  const comparisonShareUrl = window.location.href

  const handleCountySelect = (countyId: string) => {
    startTransition(() => {
      setSelectedCountyId(countyId)
      setSelectedTownshipId(null)
      setSelectedSchoolId(null)
      setCountyDetailError(null)
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
      setCountyDetailError(null)
    })
  }

  const handlePrefetchCounty = (countyId: string | null) => {
    if (!summaryDataset || !countyId || selectedCounty) {
      return
    }

    const county = summaryDataset.counties.find((entry) => entry.id === countyId)
    if (!county) {
      return
    }

    void prefetchCountyResources(county, { includeTownshipSlice: true, includeBucketSlice: true })
  }

  const handlePrefetchAllCounties = () => {
    if (!summaryDataset) {
      return
    }

    summaryDataset.counties.forEach((county) => {
      void prefetchCountyResources(county, { includeTownshipSlice: true, includeBucketSlice: true })
    })
  }

  const pushRecentScenario = (countyIds: string[], scenarioName: string) => {
    if (!summaryDataset) {
      return
    }

    const scenarioSnapshot = createSavedComparisonScenario({
      name: scenarioName.trim() || `比較 ${countyIds.length} 縣市`,
      countyIds: countyIds.filter((countyId) => summaryDataset.counties.some((county) => county.id === countyId)).slice(0, 4),
      activeYear,
      educationLevel,
      managementType,
      region,
    })

    if (scenarioSnapshot.countyIds.length === 0) {
      return
    }

    setRecentScenarios((current) => {
      const next = [scenarioSnapshot, ...current.filter((scenario) => scenario.id !== scenarioSnapshot.id)].slice(0, 6)
      writeStoredScenarios(COMPARISON_RECENTS_STORAGE_KEY, next)
      return next
    })
  }

  const toggleComparisonCounty = (countyId: string) => {
    setComparisonCountyIds((current) => {
      if (current.includes(countyId)) {
        const next = current.filter((entry) => entry !== countyId)
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
      await navigator.clipboard.writeText(comparisonShareUrl)
      setCopyFeedback('比較情境連結已複製')
    } catch {
      setCopyFeedback('無法直接複製，請手動複製網址')
    }
  }

  const applySavedScenario = (scenario: SavedComparisonScenario) => {
    pushRecentScenario(scenario.countyIds, scenario.name)
    startTransition(() => {
      setComparisonScenarioName(scenario.name)
      setComparisonCountyIds(scenario.countyIds.filter((countyId) => summaryDataset.counties.some((county) => county.id === countyId)).slice(0, 4))
      setActiveYear(summaryDataset.years.includes(scenario.activeYear) ? scenario.activeYear : (summaryDataset.years.at(-1) ?? DEFAULT_YEAR))
      setEducationLevel(EDUCATION_LEVELS.includes(scenario.educationLevel) ? scenario.educationLevel : '全部')
      setManagementType(MANAGEMENT_TYPES.includes(scenario.managementType) ? scenario.managementType : '全部')
      setRegion(REGION_GROUPS.includes(scenario.region) ? scenario.region : '全部')
      setSelectedCountyId(null)
      setSelectedTownshipId(null)
      setSelectedSchoolId(null)
    })
    setScenarioFeedback(`已套用情境：${scenario.name}`)
  }

  const handleSaveFavoriteScenario = () => {
    if (!activeScenarioSnapshot) {
      setScenarioFeedback('目前沒有可收藏的比較情境')
      return
    }

    pushRecentScenario(activeScenarioSnapshot.countyIds, activeScenarioSnapshot.name)

    setFavoriteScenarios((current) => {
      const next = [activeScenarioSnapshot, ...current.filter((scenario) => scenario.id !== activeScenarioSnapshot.id)].slice(0, 8)
      writeStoredScenarios(COMPARISON_FAVORITES_STORAGE_KEY, next)
      return next
    })
    setScenarioFeedback(`已收藏情境：${activeScenarioSnapshot.name}`)
  }

  const handleRemoveFavoriteScenario = (scenarioId: string) => {
    setFavoriteScenarios((current) => {
      const next = current.filter((scenario) => scenario.id !== scenarioId)
      writeStoredScenarios(COMPARISON_FAVORITES_STORAGE_KEY, next)
      return next
    })
  }

  const handleRenameFavoriteScenario = (scenarioId: string) => {
    const nextName = window.prompt('輸入新的情境名稱')?.trim()
    if (!nextName) {
      return
    }

    setFavoriteScenarios((current) => {
      const next = current.map((scenario) => {
        if (scenario.id !== scenarioId) {
          return scenario
        }

        return createSavedComparisonScenario({
          name: nextName,
          countyIds: scenario.countyIds,
          activeYear: scenario.activeYear,
          educationLevel: scenario.educationLevel,
          managementType: scenario.managementType,
          region: scenario.region,
          pinned: scenario.pinned,
        })
      })
      writeStoredScenarios(COMPARISON_FAVORITES_STORAGE_KEY, next)
      return next
    })
    setScenarioFeedback(`已重新命名情境：${nextName}`)
  }

  const handleTogglePinScenario = (scenarioId: string) => {
    setFavoriteScenarios((current) => {
      const next = current
        .map((scenario) =>
          scenario.id === scenarioId
            ? {
                ...scenario,
                pinned: !scenario.pinned,
                updatedAt: new Date().toISOString(),
              }
            : scenario,
        )
        .sort((left, right) => Number(Boolean(right.pinned)) - Number(Boolean(left.pinned)))
      writeStoredScenarios(COMPARISON_FAVORITES_STORAGE_KEY, next)
      return next
    })
  }

  const handleExportFavoriteScenarios = () => {
    if (favoriteScenarios.length === 0) {
      setScenarioFeedback('目前沒有可匯出的收藏情境')
      return
    }

    downloadJsonFile('atlas-comparison-scenarios.json', favoriteScenarios)
    setScenarioFeedback('已匯出收藏情境 JSON')
  }

  const handleImportFavoriteScenarios = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    try {
      const text = await file.text()
      const imported = readStoredScenariosFromText(text)
      if (imported.length === 0) {
        setScenarioFeedback('匯入檔案沒有有效情境')
        return
      }

      setFavoriteScenarios((current) => {
        const scenarioMap = new Map<string, SavedComparisonScenario>()
        ;[...imported, ...current].forEach((scenario) => {
          if (!scenarioMap.has(scenario.id)) {
            scenarioMap.set(scenario.id, scenario)
          }
        })
        const next = [...scenarioMap.values()]
          .sort((left, right) => Number(Boolean(right.pinned)) - Number(Boolean(left.pinned)))
          .slice(0, 16)
        writeStoredScenarios(COMPARISON_FAVORITES_STORAGE_KEY, next)
        return next
      })
      setScenarioFeedback(`已匯入 ${imported.length} 筆情境`)
    } catch {
      setScenarioFeedback('無法解析情境 JSON')
    }
  }

  const handleDownloadInvestigation = (item: InvestigationItem) => {
    const hasSchools = item.seriesRows.some((row) => row.schools != null)
    const hasFlags = item.seriesRows.some((row) => (row.flags?.length ?? 0) > 0)
    const header = ['year', 'students', ...(hasSchools ? ['schools'] : []), ...(hasFlags ? ['flags'] : [])]
    const rows = item.seriesRows.map((row) => [
      String(row.year),
      String(row.students),
      ...(hasSchools ? [String(row.schools ?? '')] : []),
      ...(hasFlags ? [row.flags?.join('|') ?? ''] : []),
    ])

    downloadCsvFile(item.downloadName, [header, ...rows])
  }

  const handleDownloadAllInvestigations = () => {
    if (filteredAnomalies.length === 0) {
      setScenarioFeedback('目前沒有可匯出的異常序列')
      return
    }

    const rows = filteredAnomalies.flatMap((item) =>
      item.seriesRows.map((row) => [
        item.scope,
        item.title,
        classifyInvestigation(item),
        item.severity,
        item.meta,
        String(row.year),
        String(row.students),
        String(row.schools ?? ''),
        row.flags?.join('|') ?? '',
      ]),
    )

    downloadCsvFile(`${scopeHeadline}-異常序列整批匯出.csv`, [
      ['scope', 'title', 'filter', 'severity', 'meta', 'year', 'students', 'schools', 'flags'],
      ...rows,
    ])
  }

  return (
    <div className="app-shell" data-testid="atlas-app">
      <header className="atlas-topbar">
        <div className="atlas-topbar__intro panel">
          <div>
            <p className="eyebrow">Taiwan Education Atlas</p>
            <h1>台灣學生數地圖工作台</h1>
          </div>
          <p>
            以 Leaflet 地圖作為主舞台，將篩選條件放到上方，把比較、異常調查、排行與學校表格收斂到左側分析工作台。
          </p>
        </div>

        <div className={isOffline ? 'atlas-status atlas-status--offline' : 'atlas-status'}>
          <strong>{isOffline ? '離線首頁模式' : '快取可用模式'}</strong>
          <span>
            {isOffline
              ? `已啟用最近一次快取摘要，可離線查看 ${offlineReadyWithBuckets} 份地方切片與全台摘要。`
              : `目前已快取 ${offlineReadyWithBuckets} 份地方切片，累積傳輸 ${formatFileSize(loadObservation.totalTransferredBytes)}。`}
          </span>
        </div>

        <section className="atlas-filterbar panel">
          <div className="atlas-filterbar__years">
            <span className="filter-group__label">學年度</span>
            <div className="chip-row">
              {summaryDataset.years.map((year) => (
                <button
                  key={year}
                  type="button"
                  className={year === activeYear ? 'chip chip--active' : 'chip'}
                  onClick={() => {
                    setIsYearPlaybackActive(false)
                    startTransition(() => setActiveYear(year))
                  }}
                >
                  {year}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={isYearPlaybackActive ? 'ghost-button ghost-button--active' : 'ghost-button'}
              onClick={() => setIsYearPlaybackActive((current) => !current)}
            >
              {isYearPlaybackActive ? '停止年度播放' : '播放歷年變動'}
            </button>
          </div>

          <div className="atlas-filterbar__controls">
            <label className="filter-select">
              <span>教育階段</span>
              <select value={educationLevel} onChange={(event) => startTransition(() => setEducationLevel(event.target.value as EducationLevelFilter))}>
                {EDUCATION_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-select">
              <span>公私立</span>
              <select value={managementType} onChange={(event) => startTransition(() => setManagementType(event.target.value as ManagementTypeFilter))}>
                {MANAGEMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-select">
              <span>區域</span>
              <select value={region} onChange={(event) => startTransition(() => setRegion(event.target.value as RegionGroupFilter))}>
                {REGION_GROUPS.map((regionOption) => (
                  <option key={regionOption} value={regionOption}>
                    {regionOption}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-select filter-select--search">
              <span>搜尋縣市 / 鄉鎮 / 學校</span>
              <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="例如：宜蘭、國中、私立" />
            </label>
          </div>

          <div className="atlas-filterbar__meta">
            <button type="button" className="ghost-button" onClick={handleResetScope} data-testid="reset-scope-button">
              回到全台
            </button>
            <span>{isPending ? '畫面更新中…' : `${formatAcademicYear(activeYear)} 已套用`}</span>
          </div>

          <div className="atlas-county-picks">
            <span className="filter-group__label">縣市快速切換</span>
            <div className="chip-row">
              {countyQuickPicks.map((county) => (
                <button
                  key={county.id}
                  type="button"
                  className={county.id === activeCountyId ? 'chip chip--active' : 'chip'}
                  onClick={() => handleCountySelect(county.id)}
                  onMouseEnter={() => handlePrefetchCounty(county.id)}
                >
                  {county.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      </header>

      <div className="atlas-workbench">
        <main className="atlas-analysis-column">
          {/* ─── Macro: 全台概況總覽 ─── */}
          <div className="atlas-tier atlas-tier--macro">
            <div className="atlas-tier__label"><span>Macro</span> 全台概況</div>

            <section className="panel scope-panel">
              <div className="scope-breadcrumbs" data-testid="scope-breadcrumbs">
                {scopePath.map((step) => (
                  <span key={step}>{step}</span>
                ))}
              </div>

              <div className="scope-panel__header">
                <div>
                  <p className="eyebrow">目前工作範圍</p>
                  <h2>{scopeHeadline}</h2>
                  <p>{scopeDescription}</p>
                </div>
                <div className="scope-panel__playback">
                  <strong>{formatAcademicYear(activeYear)}</strong>
                  <span>{isYearPlaybackActive ? '動畫播放中' : '靜態檢視中'}</span>
                </div>
              </div>

              <div className="stat-grid stat-grid--top">
                <div data-testid="current-scope-card">
                  <StatCard
                    title={currentScope.label}
                    value={`${formatStudents(currentScope.students)} 人`}
                    caption={`${currentScope.schools.toLocaleString('zh-TW')} 校 | ${formatDelta(currentScope.delta)} / ${formatPercent(currentScope.deltaRatio)}`}
                    tone="lagoon"
                  />
                </div>
                <StatCard
                  title="正式資料覆蓋"
                  value={`${observedCounties.length.toLocaleString('zh-TW')} 縣市`}
                  caption={`前 3 名預抓鍵: ${topCountyPrefetchIds || '已切入縣市模式'}`}
                  tone="sun"
                />
                <StatCard
                  title="快取傳輸"
                  value={formatFileSize(loadObservation.totalTransferredBytes)}
                  caption={`記憶體 ${loadObservation.memoryHits} / IndexedDB ${loadObservation.indexedDbHits} / 快取命中 ${loadObservation.cacheHits}`}
                  tone="coral"
                />
              </div>

              <div className="education-distribution-bar">
                {educationDistribution.map((row) => (
                  <div key={row.level} className="education-distribution-bar__segment" style={{ flex: Math.max(row.share, 0.02) }} title={`${row.level}: ${formatStudents(row.students)} 人 (${(row.share * 100).toFixed(1)}%)`}>
                    <strong>{row.level}</strong>
                    <span>{(row.share * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>

              <div className="scope-panel__actions">
                <button type="button" className="ghost-button" onClick={handlePrefetchAllCounties}>
                  預載入全部縣市（離線用）
                </button>
              </div>
            </section>

            <TrendChart chartId="scope-trend" title={`${currentScope.label} 歷年學生數`} subtitle="年度播放模式會同步驅動這張折線圖" points={currentScope.trend} activeYear={activeYear} />
          </div>

          {/* ─── Regional: 區域深度分析 ─── */}
          <div className="atlas-tier atlas-tier--regional">
            <div className="atlas-tier__label"><span>Regional</span> 區域分析</div>

            <section className="panel comparison-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">比較工作台</p>
                  <h3>縣市交叉比較</h3>
                </div>
                <p className="panel-heading__meta">可同時鎖定 4 個縣市，並把情境名稱與組合直接寫入 URL 分享。</p>
              </div>

              <div className="comparison-panel__controls">
                <label className="filter-select comparison-panel__scenario-input">
                  <span>比較情境名稱</span>
                  <input value={comparisonScenarioName} onChange={(event) => setComparisonScenarioName(event.target.value)} placeholder="例如：北東部少子化對照" />
                </label>
                <div className="comparison-panel__actions">
                  <button type="button" className="ghost-button" onClick={handleCopyComparisonLink}>
                    複製分享連結
                  </button>
                  <button type="button" className="ghost-button" onClick={handleSaveFavoriteScenario}>
                    收藏目前情境
                  </button>
                  <button type="button" className="ghost-button" onClick={handleExportFavoriteScenarios}>
                    匯出 JSON
                  </button>
                  <label className="ghost-button ghost-button--file">
                    匯入 JSON
                    <input type="file" accept="application/json" onChange={handleImportFavoriteScenarios} hidden />
                  </label>
                  {copyFeedback ? <span className="comparison-panel__feedback">{copyFeedback}</span> : <span className="comparison-panel__feedback">compare / scenario 會自動寫入網址</span>}
                  {scenarioFeedback ? <span className="comparison-panel__feedback">{scenarioFeedback}</span> : null}
                </div>
              </div>

              <div className="comparison-panel__chips">
                {comparisonCandidates.map((row) => (
                  <label
                    key={row.id}
                    className={effectiveComparisonCountyIds.includes(row.id) ? 'chip chip--active comparison-toggle' : 'chip comparison-toggle'}
                  >
                    <input
                      type="checkbox"
                      checked={effectiveComparisonCountyIds.includes(row.id)}
                      onChange={() => toggleComparisonCounty(row.id)}
                    />
                    {row.displayName}
                  </label>
                ))}
              </div>

              <div className="comparison-grid">
                {comparisonSummaries.map((county) => (
                  <article key={county.id} className="comparison-card">
                    <div className="comparison-card__header">
                      <div>
                        <strong>{county.name}</strong>
                        <span>{county.region}</span>
                      </div>
                      <span>{formatDelta(county.delta)}</span>
                    </div>
                    <div className="comparison-card__stats">
                      <span>{formatStudents(county.students)} 人</span>
                      <span>{county.schools} 校</span>
                      <span>{formatPercent(county.deltaRatio)}</span>
                    </div>
                    <div className="comparison-card__distribution">
                      {county.distribution.map((row) => (
                        <div key={`${county.id}-${row.level}`} className="comparison-card__distribution-row">
                          <div>
                            <strong>{row.level}</strong>
                            <span>{formatStudents(row.students)} 人 / {row.schools} 校</span>
                          </div>
                          <div className="distribution-bar">
                            <div className="distribution-bar__fill" style={{ width: `${Math.max(row.share * 100, row.students > 0 ? 8 : 0)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>

              <div className="scenario-library">
                <section className="scenario-library__section">
                  <div className="scenario-library__header">
                    <strong>本地收藏</strong>
                    <span>{favoriteScenarios.length.toLocaleString('zh-TW')} 筆</span>
                  </div>
                  <div className="scenario-library__list">
                    {favoriteScenarios.length === 0 ? <span className="comparison-panel__feedback">尚未收藏情境</span> : null}
                    {favoriteScenarios.map((scenario) => (
                      <div key={scenario.id} className={favoriteScenarioIds.has(scenario.id) && activeScenarioSnapshot?.id === scenario.id ? 'scenario-chip scenario-chip--active' : 'scenario-chip'}>
                        <button type="button" className="scenario-chip__apply" onClick={() => applySavedScenario(scenario)}>
                          <strong>{scenario.name}</strong>
                          <span>{scenario.pinned ? '已釘選 / ' : ''}{scenario.countyIds.length} 縣市 / {scenario.activeYear} 學年</span>
                        </button>
                        <button type="button" className="scenario-chip__remove" onClick={() => handleTogglePinScenario(scenario.id)}>
                          {scenario.pinned ? '取消釘選' : '釘選'}
                        </button>
                        <button type="button" className="scenario-chip__remove" onClick={() => handleRenameFavoriteScenario(scenario.id)}>
                          重新命名
                        </button>
                        <button type="button" className="scenario-chip__remove" onClick={() => handleRemoveFavoriteScenario(scenario.id)}>
                          移除
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="scenario-library__section">
                  <div className="scenario-library__header">
                    <strong>最近開啟</strong>
                    <span>{recentScenarios.length.toLocaleString('zh-TW')} 筆</span>
                  </div>
                  <div className="scenario-library__list">
                    {recentScenarios.length === 0 ? <span className="comparison-panel__feedback">尚未建立最近清單</span> : null}
                    {recentScenarios.map((scenario) => (
                      <button key={scenario.id} type="button" className={activeScenarioSnapshot?.id === scenario.id ? 'scenario-recent scenario-recent--active' : 'scenario-recent'} onClick={() => applySavedScenario(scenario)}>
                        <strong>{scenario.name}</strong>
                        <span>{scenario.countyIds.join('、')}</span>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </section>

            <InsightPanel
              title={selectedCounty ? `${selectedCounty.name} 鄉鎮排行` : '全台縣市排行'}
              subtitle={selectedCounty ? '點擊鄉鎮即可同步切換表格與單校焦點' : '點擊縣市可載入地方細節與鄉鎮界線'}
              rows={topRows}
              activeRowId={activeTownshipId ?? activeCountyId}
              onSelectRow={(rowId) => {
                if (selectedCounty) {
                  handleTownshipSelect(rowId)
                  return
                }

                handleCountySelect(rowId)
              }}
              onHoverRow={(rowId) => {
                if (!selectedCounty) {
                  handlePrefetchCounty(rowId)
                }
              }}
              emptyMessage="目前條件沒有可顯示的排行資料。"
            />

            <section className="panel anomaly-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">資料治理</p>
                  <h3>異常資料調查面板</h3>
                </div>
                <div className="anomaly-panel__heading-actions">
                  <p className="panel-heading__meta">彙整停辦、缺年度、待確認與正式註記，並提供原始年度序列對照、單筆下載與整批匯出。</p>
                  <label className="filter-select">
                    <span>匯出篩選</span>
                    <select value={investigationFilter} onChange={(event) => setInvestigationFilter(event.target.value as InvestigationFilter)}>
                      <option value="全部">全部</option>
                      <option value="缺年度">缺年度</option>
                      <option value="待確認">待確認</option>
                      <option value="停辦/整併">停辦/整併</option>
                      <option value="正式註記">正式註記</option>
                    </select>
                  </label>
                  <button type="button" className="ghost-button" onClick={handleDownloadAllInvestigations}>
                    整批匯出目前異常
                  </button>
                </div>
              </div>

              <div className="anomaly-grid">
                {filteredAnomalies.length === 0 ? (
                  <div className="empty-state">目前工作範圍沒有額外異常訊號。</div>
                ) : (
                  filteredAnomalies.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={selectedInvestigationId === item.id || (!selectedInvestigationId && activeInvestigation?.id === item.id) ? `data-note data-note--${item.severity} data-note--selected` : `data-note data-note--${item.severity}`}
                      onClick={() => setSelectedInvestigationId(item.id)}
                    >
                      <div className="anomaly-card__header">
                        <strong>{item.title}</strong>
                        <span>{item.scope}</span>
                      </div>
                      <span>{item.detail}</span>
                      <small>{item.meta}</small>
                    </button>
                  ))
                )}
              </div>

              {activeInvestigation ? (
                <div className="anomaly-detail">
                  <div className="anomaly-detail__header">
                    <div>
                      <p className="eyebrow">原始年度序列</p>
                      <h4>{activeInvestigation.title}</h4>
                      <p>{activeInvestigation.detail}</p>
                    </div>
                    <button type="button" className="ghost-button" onClick={() => handleDownloadInvestigation(activeInvestigation)}>
                      下載原始序列 CSV
                    </button>
                  </div>

                  <div className="anomaly-series-table-wrap">
                    <table className="anomaly-series-table">
                      <thead>
                        <tr>
                          <th>年度</th>
                          <th>學生數</th>
                          <th>學校數</th>
                          <th>旗標</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeInvestigation.seriesRows.map((row) => (
                          <tr key={`${activeInvestigation.id}-${row.year}`}>
                            <td>{row.year}</td>
                            <td>{formatStudents(row.students)}</td>
                            <td>{row.schools != null ? row.schools.toLocaleString('zh-TW') : '—'}</td>
                            <td>{row.flags?.length ? row.flags.join(' / ') : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <div className="note-stack" data-testid="scope-notes">
                {scopeNotes.length === 0 ? <div className="empty-state">目前工作範圍沒有額外正式註記。</div> : null}
                {scopeNotes.map((note) => (
                  <article key={`${note.type}-${note.message}`} className={`data-note data-note--${note.severity}`} data-testid="data-note">
                    <strong>{note.type}</strong>
                    <span>{note.message}</span>
                  </article>
                ))}
              </div>
            </section>
          </div>

          {/* ─── Micro: 學校工作台 ─── */}
          <div className="atlas-tier atlas-tier--micro">
            <div className="atlas-tier__label"><span>Micro</span> 學校工作台</div>

            <section className="panel school-detail-panel" data-testid="school-detail-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">學校資料表</p>
                  <h3>{schoolPanelTitle}</h3>
                </div>
                <p className="panel-heading__meta">保留排序、匯出與單校焦點；切換範圍時表格會同步刷新。</p>
              </div>

              {!selectedCounty ? (
                <div className="empty-state">請先從地圖或排行選擇縣市，系統才會載入該縣市的學校明細。</div>
              ) : countyDetailError ? (
                <div className="empty-state">{countyDetailError}</div>
              ) : isCountyDetailLoading ? (
                <div className="empty-state" data-testid="county-detail-loading">正在載入 {selectedCounty.name} 的學校細節資料...</div>
              ) : schoolInsights.length === 0 ? (
                <div className="empty-state">目前篩選條件沒有對應學校，請放寬條件或切換分析層級。</div>
              ) : (
                <>
                  <SchoolDataTable
                    schools={schoolInsights}
                    selectedSchoolId={selectedSchool?.id ?? null}
                    onSelectSchool={setSelectedSchoolId}
                    scopeLabel={selectedTownshipSummary?.label ?? selectedCountySummary?.label ?? selectedCounty.name}
                  />

                  {selectedSchool ? (
                    <div className="school-focus" data-testid="school-focus-panel">
                      <div className="school-focus__summary">
                        <div>
                          <p className="eyebrow">單校焦點</p>
                          <h3>{selectedSchool.name}</h3>
                          <p>
                            {selectedSchool.countyName} / {selectedSchool.townshipName} / {selectedSchool.educationLevel} / {selectedSchool.managementType}
                          </p>
                        </div>
                        <div className="school-focus__statline">
                          <strong>{formatStudents(selectedSchool.currentStudents)} 人</strong>
                          <span>
                            {formatDelta(selectedSchool.delta)} 人 / {formatPercent(selectedSchool.deltaRatio)}
                          </span>
                        </div>
                      </div>

                      <TrendChart chartId="school-trend" title={`${selectedSchool.name} 歷年學生數`} subtitle="單校趨勢會在縣市細節載入後提供" points={selectedSchool.trend} activeYear={activeYear} />

                      {selectedSchool.dataNotes && selectedSchool.dataNotes.length > 0 ? (
                        <div className="note-stack" data-testid="school-notes">
                          {selectedSchool.dataNotes.map((note) => (
                            <article key={`${selectedSchool.id}-${note.type}-${note.message}`} className={`data-note data-note--${note.severity}`} data-testid="data-note">
                              <strong>{note.type}</strong>
                              <span>{note.message}</span>
                            </article>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </section>
          </div>
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