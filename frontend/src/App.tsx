import { useDeferredValue, useEffect, useState, useTransition } from 'react'

import './App.css'

import InsightPanel from './components/InsightPanel'
import SchoolDataTable from './components/SchoolDataTable'
import StatCard from './components/StatCard'
import TaiwanExplorerMap from './components/TaiwanExplorerMap'
import TrendChart from './components/TrendChart'
import {
  ACADEMIC_YEARS,
  EDUCATION_LEVELS,
  MANAGEMENT_TYPES,
  REGION_GROUPS,
  getAtlasLoadObservations,
  loadCountyBoundaries,
  loadCountyDetail,
  loadEducationSummary,
  loadTownshipBoundaries,
  prefetchCountyResources,
  subscribeAtlasLoadObservations,
  type AcademicYear,
  type AtlasLoadObservationSnapshot,
  type CountyBoundaryCollection,
  type CountyDetailDataset,
  type DataNote,
  type EducationLevelFilter,
  type EducationSummaryDataset,
  type ManagementTypeFilter,
  type RegionGroupFilter,
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
  getNationSummary,
  getSchoolInsights,
  getTownshipNotesFromSummary,
  getTownshipScopeSummaryFromSummary,
  getTownshipSummaries,
} from './lib/analytics'

const DEFAULT_YEAR = ACADEMIC_YEARS.at(-1) ?? 113

type InvestigationItem = {
  id: string
  scope: string
  title: string
  detail: string
  meta: string
  severity: DataNote['severity']
}

function readInitialQueryState() {
  const params = new URLSearchParams(window.location.search)
  const year = Number(params.get('year'))
  const educationLevel = params.get('level')
  const managementType = params.get('management')
  const region = params.get('region')

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

function buildInvestigationItems({
  summaryDataset,
  countyRankingRows,
  selectedCounty,
  selectedCountyDetail,
  selectedTownshipSummary,
  scopeNotes,
}: {
  summaryDataset: EducationSummaryDataset
  countyRankingRows: ReturnType<typeof getCountyRankingRows>
  selectedCounty: EducationSummaryDataset['counties'][number] | null
  selectedCountyDetail: CountyDetailDataset | null
  selectedTownshipSummary: ReturnType<typeof getTownshipScopeSummaryFromSummary>
  scopeNotes: DataNote[]
}) {
  const items = new Map<string, InvestigationItem>()

  const register = (item: InvestigationItem) => {
    if (!items.has(item.id)) {
      items.set(item.id, item)
    }
  }

  scopeNotes.forEach((note, index) => {
    const scopeLabel = selectedTownshipSummary?.label ?? selectedCounty?.name ?? '全台摘要'
    register({
      id: `scope-${scopeLabel}-${note.type}-${index}`,
      scope: selectedTownshipSummary ? '鄉鎮' : selectedCounty ? '縣市' : '全台',
      title: `${scopeLabel} / ${note.type}`,
      detail: note.message,
      meta: note.years?.length ? `涉及年度: ${note.years.join('、')}` : '正式切片註記',
      severity: note.severity,
    })
  })

  if (!selectedCounty) {
    countyRankingRows.slice(0, 4).forEach((row) => {
      const county = summaryDataset.counties.find((entry) => entry.id === row.id)
      county?.dataNotes?.forEach((note, index) => {
        register({
          id: `county-${county.id}-${note.type}-${index}`,
          scope: '縣市',
          title: `${county.name} / ${note.type}`,
          detail: note.message,
          meta: `${county.region} | ${formatStudents(row.students)} 人`,
          severity: note.severity,
        })
      })
    })
  }

  selectedCountyDetail?.towns.forEach((township) => {
    township.dataNotes?.forEach((note, index) => {
      register({
        id: `town-${township.id}-${note.type}-${index}`,
        scope: '鄉鎮',
        title: `${township.name} / ${note.type}`,
        detail: note.message,
        meta: selectedCountyDetail.county.name,
        severity: note.severity,
      })
    })

    township.schools.forEach((school) => {
      if (school.status && school.status !== '正常') {
        register({
          id: `status-${school.id}-${school.status}`,
          scope: '學校',
          title: `${school.name} / ${school.status}`,
          detail: school.status === '待確認' ? '此校狀態仍待人工確認。' : '此校在正式資料中被標記為非一般持續營運狀態。',
          meta: `${township.name} | ${school.educationLevel}`,
          severity: school.status === '待確認' ? 'critical' : 'warning',
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
        })
      })
    })
  })

  return [...items.values()]
    .sort((left, right) => severityRank(right.severity) - severityRank(left.severity))
    .slice(0, 10)
}

function App() {
  const initialQueryState = readInitialQueryState()
  const [summaryDataset, setSummaryDataset] = useState<EducationSummaryDataset | null>(null)
  const [countyBoundaries, setCountyBoundaries] = useState<CountyBoundaryCollection | null>(null)
  const [countyDetailCache, setCountyDetailCache] = useState<Record<string, CountyDetailDataset>>({})
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
  const [comparisonCountyIds, setComparisonCountyIds] = useState<string[]>([])
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

    const countyIdForUrl = summaryDataset.counties.some((county) => county.id === selectedCountyId) ? selectedCountyId : null
    if (countyIdForUrl) {
      params.set('county', countyIdForUrl)
    }

    const townshipIdForUrl = countyIdForUrl
      ? summaryDataset.counties
          .find((county) => county.id === countyIdForUrl)
          ?.towns.some((township) => township.id === selectedTownshipId)
        ? selectedTownshipId
        : null
      : null
    if (townshipIdForUrl) {
      params.set('township', townshipIdForUrl)
    }

    const nextSearch = params.toString()
    const nextUrl = nextSearch ? `${window.location.pathname}?${nextSearch}` : window.location.pathname
    window.history.replaceState({}, '', nextUrl)
  }, [activeYear, deferredSearchText, educationLevel, managementType, region, selectedCountyId, selectedTownshipId, summaryDataset])

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
        void prefetchCountyResources(county, { includeTownshipSlice: true })
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

  const effectiveComparisonCountyIds = (() => {
    const availableIds = countyRankingRows.map((row) => row.id)
    const explicitIds = comparisonCountyIds.filter((countyId) => availableIds.includes(countyId))

    if (selectedCountyId && availableIds.includes(selectedCountyId) && !explicitIds.includes(selectedCountyId)) {
      explicitIds.unshift(selectedCountyId)
    }

    return (explicitIds.length > 0 ? explicitIds : availableIds).slice(0, 4)
  })()
  const comparisonSummaries = getCountyComparisonSummaries(summaryDataset.counties, effectiveComparisonCountyIds, filters)
  const comparisonCandidates = countyRankingRows.slice(0, 8)
  const anomalies = buildInvestigationItems({
    summaryDataset,
    countyRankingRows,
    selectedCounty,
    selectedCountyDetail,
    selectedTownshipSummary,
    scopeNotes,
  })
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
      ? '已聚焦指定縣市，右側地圖呈現鄉鎮界線，左側同步顯示比較與學校明細。'
      : '上方篩選列負責切片條件，左側分析工作台負責比較、排行與治理，右側專注地圖探索。'
  const generatedAtLabel = new Date(summaryDataset.generatedAt).toLocaleString('zh-TW')
  const offlineReadySlices = loadObservation.loadedCountyDetails.length + loadObservation.loadedTownshipSlices.length

  const observedCounties = summaryDataset.counties
    .filter(
      (county) =>
        loadObservation.loadedCountyDetails.includes(county.id) ||
        loadObservation.loadedTownshipSlices.includes(county.id),
    )
    .map((county) => ({
      id: county.id,
      name: county.name,
      detailBytes: loadObservation.resourceSizes[county.detailFile] ?? county.assetMetrics?.detailBytes ?? 0,
      townshipBytes: loadObservation.resourceSizes[county.townshipFile] ?? county.assetMetrics?.townshipBytes ?? 0,
      hasTownshipSlice: loadObservation.loadedTownshipSlices.includes(county.id),
    }))

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

    void prefetchCountyResources(county, { includeTownshipSlice: true })
  }

  const toggleComparisonCounty = (countyId: string) => {
    setComparisonCountyIds((current) => {
      if (current.includes(countyId)) {
        const next = current.filter((entry) => entry !== countyId)
        return next.length > 0 ? next : current
      }

      return [countyId, ...current].slice(0, 4)
    })
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
              ? `已啟用最近一次快取摘要，可離線查看 ${offlineReadySlices} 份地方切片與全台摘要。`
              : `目前已快取 ${offlineReadySlices} 份地方切片，累積傳輸 ${formatFileSize(loadObservation.totalTransferredBytes)}。`}
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
          </section>

          <div className="atlas-section-grid atlas-section-grid--lead">
            <TrendChart chartId="scope-trend" title={`${currentScope.label} 歷年學生數`} subtitle="年度播放模式會同步驅動這張折線圖" points={currentScope.trend} activeYear={activeYear} />

            <section className="panel comparison-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">比較工作台</p>
                  <h3>縣市交叉比較</h3>
                </div>
                <p className="panel-heading__meta">可同時鎖定 4 個縣市，對比學生數、校數、年增減與教育階段分布。</p>
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
                    {row.label}
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
            </section>
          </div>

          <section className="panel anomaly-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">資料治理</p>
                <h3>異常資料調查面板</h3>
              </div>
              <p className="panel-heading__meta">彙整停辦、缺年度、待確認與正式註記，方便快速追查來源與範圍。</p>
            </div>

            <div className="anomaly-grid">
              {anomalies.length === 0 ? (
                <div className="empty-state">目前工作範圍沒有額外異常訊號。</div>
              ) : (
                anomalies.map((item) => (
                  <article key={item.id} className={`data-note data-note--${item.severity}`}>
                    <div className="anomaly-card__header">
                      <strong>{item.title}</strong>
                      <span>{item.scope}</span>
                    </div>
                    <span>{item.detail}</span>
                    <small>{item.meta}</small>
                  </article>
                ))
              )}
            </div>

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

          <div className="atlas-section-grid atlas-section-grid--detail">
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
            isTownshipBoundaryLoading={isTownshipBoundaryLoading}
            onSelectCounty={handleCountySelect}
            onSelectTownship={handleTownshipSelect}
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