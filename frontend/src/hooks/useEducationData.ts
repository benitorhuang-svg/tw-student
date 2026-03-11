import { useEffect, useState } from 'react'
import {
  diffManifestAssets,
  loadCountyBuckets,
  loadCountyBoundaries,
  loadCountyDetail,
  loadDataManifest,
  loadCountySchoolAtlas,
  loadEducationSummary,
  loadValidationReport,
  loadTownshipBoundaries,
  prefetchCountyResources,
  refreshEducationSummary,
  resetAtlasBoundaryCaches,
  resetAtlasLoadObservations,
  resetAtlasManifestCache,
  resetAtlasSqliteCache,
  type CountyBucketDataset,
  type CountyBoundaryCollection,
  type CountySchoolAtlasDataset,
  type CountyDetailDataset,
  type DataManifest,
  type DataRefreshSummary,
  type EducationSummaryDataset,
  type TownshipBoundaryCollection,
  type ValidationReport,
} from '../data/educationData'
import { resolveCountyRecord } from './atlasIdentity'

export function useEducationData(selectedCountyId: string | null) {
  const [summaryDataset, setSummaryDataset] = useState<EducationSummaryDataset | null>(null)
  const [countyBoundaries, setCountyBoundaries] = useState<CountyBoundaryCollection | null>(null)
  const [countyDetailCache, setCountyDetailCache] = useState<Record<string, CountyDetailDataset>>({})
  const [countyBucketCache, setCountyBucketCache] = useState<Record<string, CountyBucketDataset>>({})
  const [countySchoolAtlasCache, setCountySchoolAtlasCache] = useState<Record<string, CountySchoolAtlasDataset>>({})
  const [townshipBoundaryCache, setTownshipBoundaryCache] = useState<Record<string, TownshipBoundaryCollection>>({})
  const [localManifest, setLocalManifest] = useState<DataManifest | null>(null)
  const [remoteManifest, setRemoteManifest] = useState<DataManifest | null>(null)
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null)
  const [refreshSummary, setRefreshSummary] = useState<DataRefreshSummary | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [countyDetailError, setCountyDetailError] = useState<string | null>(null)
  const [countySchoolAtlasError, setCountySchoolAtlasError] = useState<string | null>(null)
  const [isRefreshingData, setIsRefreshingData] = useState(false)
  const [refreshStatus, setRefreshStatus] = useState<string | null>(null)

  const selectedCountyForQuery = resolveCountyRecord(summaryDataset, selectedCountyId)
  const selectedCountyCacheKey = selectedCountyForQuery?.id ?? null

  useEffect(() => {
    Promise.all([
      loadEducationSummary(),
      loadCountyBoundaries(),
      loadDataManifest().catch(() => null),
      loadValidationReport().catch(() => null),
    ])
      .then(([nextSummary, nextBoundaries, nextManifest, nextValidationReport]) => {
        setSummaryDataset(nextSummary)
        setCountyBoundaries(nextBoundaries)
        setLocalManifest(nextManifest)
        setValidationReport(nextValidationReport)
      })
      .catch((error: Error) => setLoadError(error.message))
  }, [])

  useEffect(() => {
    if (!summaryDataset || !selectedCountyCacheKey || countyDetailCache[selectedCountyCacheKey]) return
    const county = selectedCountyForQuery
    if (!county) return
    loadCountyDetail(county.detailFile, county.countyCode ?? county.id)
      .then((detail) => setCountyDetailCache((prev) => ({ ...prev, [selectedCountyCacheKey]: detail })))
      .catch((error: Error) => setCountyDetailError(error.message))
  }, [countyDetailCache, selectedCountyCacheKey, selectedCountyForQuery, summaryDataset])

  useEffect(() => {
    if (!summaryDataset || !selectedCountyCacheKey || townshipBoundaryCache[selectedCountyCacheKey]) return
    if (!selectedCountyForQuery) return
    loadTownshipBoundaries(selectedCountyCacheKey, selectedCountyForQuery.townshipFile)
      .then((boundaries) => setTownshipBoundaryCache((prev) => ({ ...prev, [selectedCountyCacheKey]: boundaries })))
      .catch((error: Error) => setLoadError(error.message))
  }, [selectedCountyCacheKey, selectedCountyForQuery, summaryDataset, townshipBoundaryCache])

  useEffect(() => {
    if (!summaryDataset || !selectedCountyCacheKey || countyBucketCache[selectedCountyCacheKey]) return
    if (!selectedCountyForQuery) return
    loadCountyBuckets(selectedCountyForQuery.bucketFile, selectedCountyForQuery.countyCode ?? selectedCountyForQuery.id)
      .then((buckets) => setCountyBucketCache((prev) => ({ ...prev, [selectedCountyCacheKey]: buckets })))
      .catch((error: Error) => setLoadError(error.message))
  }, [countyBucketCache, selectedCountyCacheKey, selectedCountyForQuery, summaryDataset])

  useEffect(() => {
    if (!summaryDataset || !selectedCountyCacheKey || countySchoolAtlasCache[selectedCountyCacheKey]) return
    if (!selectedCountyForQuery) return
    loadCountySchoolAtlas(selectedCountyForQuery.schoolAtlasFile, selectedCountyForQuery.countyCode ?? selectedCountyForQuery.id)
      .then((atlas) => setCountySchoolAtlasCache((prev) => ({ ...prev, [selectedCountyCacheKey]: atlas })))
      .catch((error: Error) => setCountySchoolAtlasError(error.message))
  }, [countySchoolAtlasCache, selectedCountyCacheKey, selectedCountyForQuery, summaryDataset])

  const prefetchCounty = (countyId: string | null) => {
    if (!summaryDataset || !countyId) return
    const county = resolveCountyRecord(summaryDataset, countyId)
    if (county) void prefetchCountyResources(county, { includeTownshipSlice: true, includeBucketSlice: true, includeSchoolAtlasSlice: true })
  }

  const prefetchAllCounties = () => {
    if (!summaryDataset) return
    summaryDataset.counties.forEach((county) => {
      void prefetchCountyResources(county, { includeTownshipSlice: true, includeBucketSlice: true, includeSchoolAtlasSlice: true })
    })
  }

  const clearCountyDetailError = () => setCountyDetailError(null)

  const refreshData = async () => {
    setIsRefreshingData(true)
    setRefreshStatus('比對部署 manifest 與本地版本...')

    try {
      const nextRemoteManifest = await loadDataManifest({ forceRefresh: true })
      setRemoteManifest(nextRemoteManifest)

      if (localManifest?.contentHash === nextRemoteManifest.contentHash) {
        const nextRefreshSummary: DataRefreshSummary = {
          checkedAt: new Date().toISOString(),
          overallStatus: 'up-to-date',
          localGeneratedAt: localManifest.generatedAt,
          remoteGeneratedAt: nextRemoteManifest.generatedAt,
          localContentHash: localManifest.contentHash,
          remoteContentHash: nextRemoteManifest.contentHash,
          schemaVersion: nextRemoteManifest.schemaVersion,
          updatedAssets: [],
          skippedAssets: nextRemoteManifest.assets.map((asset) => asset.path),
          failedAssets: [],
          rolledBackAssets: [],
          message: '部署資料沒有變更，沿用目前快取。',
        }

        setRefreshSummary(nextRefreshSummary)
        setRefreshStatus(nextRefreshSummary.message)
        return
      }

      const { changedAssets } = diffManifestAssets(localManifest, nextRemoteManifest)
      const changedPaths = new Set(changedAssets.map((asset) => asset.path))
      const updatedAssets: string[] = []
      const skippedAssets: string[] = []
      const failedAssets: string[] = []
      const rolledBackAssets: string[] = []

      let nextSummaryDataset = summaryDataset
      let nextCountyBoundaries = countyBoundaries
      let nextCountyDetailCache = countyDetailCache
      let nextCountyBucketCache = countyBucketCache
      let nextCountySchoolAtlasCache = countySchoolAtlasCache
      let nextTownshipBoundaryCache = townshipBoundaryCache
      let nextValidationReport = validationReport

      const sqliteChanged = changedPaths.has('education-atlas.sqlite') || changedPaths.has('education-summary.json')
      const countyBoundariesChanged = changedPaths.has('county-boundaries.topo.json')
      const validationChanged = changedPaths.has('validation-report.json')

      if (sqliteChanged) {
        try {
          resetAtlasSqliteCache()
          resetAtlasLoadObservations()
          nextSummaryDataset = await refreshEducationSummary()
          nextCountyDetailCache = {}
          nextCountyBucketCache = {}
          updatedAssets.push(...changedAssets.filter((asset) => asset.path === 'education-atlas.sqlite' || asset.path === 'education-summary.json').map((asset) => asset.path))
        } catch (error) {
          const impacted = changedAssets.filter((asset) => asset.path === 'education-atlas.sqlite' || asset.path === 'education-summary.json').map((asset) => asset.path)
          failedAssets.push(...impacted)
          rolledBackAssets.push(...impacted)
          setRefreshStatus(error instanceof Error ? `摘要刷新失敗：${error.message}` : '摘要刷新失敗')
        }
      }

      if (countyBoundariesChanged) {
        try {
          resetAtlasBoundaryCaches()
          nextCountyBoundaries = await loadCountyBoundaries({ forceRefresh: true })
          updatedAssets.push('county-boundaries.topo.json')
        } catch (error) {
          failedAssets.push('county-boundaries.topo.json')
          rolledBackAssets.push('county-boundaries.topo.json')
          setRefreshStatus(error instanceof Error ? `縣市邊界刷新失敗：${error.message}` : '縣市邊界刷新失敗')
        }
      }

      if (validationChanged || !validationReport) {
        try {
          nextValidationReport = await loadValidationReport({ forceRefresh: true })
          if (changedPaths.has('validation-report.json')) {
            updatedAssets.push('validation-report.json')
          }
        } catch (error) {
          if (changedPaths.has('validation-report.json')) {
            failedAssets.push('validation-report.json')
            rolledBackAssets.push('validation-report.json')
          }
          setRefreshStatus(error instanceof Error ? `驗證報表刷新失敗：${error.message}` : '驗證報表刷新失敗')
        }
      }

      setCountyDetailError(null)
      setCountySchoolAtlasError(null)

      const selectedCounty = resolveCountyRecord(nextSummaryDataset, selectedCountyId)
      if (selectedCounty) {
        if (sqliteChanged && failedAssets.every((path) => path !== 'education-atlas.sqlite' && path !== 'education-summary.json')) {
          try {
            const [detail, buckets] = await Promise.all([
              loadCountyDetail(selectedCounty.detailFile, selectedCounty.countyCode ?? selectedCounty.id),
              loadCountyBuckets(selectedCounty.bucketFile, selectedCounty.countyCode ?? selectedCounty.id),
            ])
            nextCountyDetailCache = { ...nextCountyDetailCache, [selectedCounty.id]: detail }
            nextCountyBucketCache = { ...nextCountyBucketCache, [selectedCounty.id]: buckets }
          } catch (error) {
            setCountyDetailError(error instanceof Error ? error.message : '縣市明細重新載入失敗')
          }
        }

        if (changedPaths.has(selectedCounty.schoolAtlasFile)) {
          try {
            const schoolAtlas = await loadCountySchoolAtlas(selectedCounty.schoolAtlasFile, selectedCounty.countyCode ?? selectedCounty.id, { forceRefresh: true })
            nextCountySchoolAtlasCache = { ...nextCountySchoolAtlasCache, [selectedCounty.id]: schoolAtlas }
            updatedAssets.push(selectedCounty.schoolAtlasFile)
          } catch (error) {
            failedAssets.push(selectedCounty.schoolAtlasFile)
            rolledBackAssets.push(selectedCounty.schoolAtlasFile)
            setCountySchoolAtlasError(error instanceof Error ? error.message : '校別結構切片重新載入失敗')
          }
        }

        if (changedPaths.has(selectedCounty.townshipFile)) {
          try {
            const townshipBoundaries = await loadTownshipBoundaries(selectedCounty.id, selectedCounty.townshipFile, { forceRefresh: true })
            nextTownshipBoundaryCache = { ...nextTownshipBoundaryCache, [selectedCounty.id]: townshipBoundaries }
            updatedAssets.push(selectedCounty.townshipFile)
          } catch (error) {
            failedAssets.push(selectedCounty.townshipFile)
            rolledBackAssets.push(selectedCounty.townshipFile)
            setRefreshStatus(error instanceof Error ? `鄉鎮邊界刷新失敗：${error.message}` : '鄉鎮邊界刷新失敗')
          }
        }
      }

      changedAssets.forEach((asset) => {
        if (!updatedAssets.includes(asset.path) && !failedAssets.includes(asset.path)) {
          skippedAssets.push(asset.path)
        }
      })

      setSummaryDataset(nextSummaryDataset)
      setCountyBoundaries(nextCountyBoundaries)
      setCountyDetailCache(nextCountyDetailCache)
      setCountyBucketCache(nextCountyBucketCache)
      setCountySchoolAtlasCache(nextCountySchoolAtlasCache)
      setTownshipBoundaryCache(nextTownshipBoundaryCache)
      setValidationReport(nextValidationReport)

      const nextRefreshSummary: DataRefreshSummary = {
        checkedAt: new Date().toISOString(),
        overallStatus: failedAssets.length > 0 ? (updatedAssets.length > 0 ? 'partial-failure' : 'failed') : 'updated',
        localGeneratedAt: localManifest?.generatedAt,
        remoteGeneratedAt: nextRemoteManifest.generatedAt,
        localContentHash: localManifest?.contentHash,
        remoteContentHash: nextRemoteManifest.contentHash,
        schemaVersion: nextRemoteManifest.schemaVersion,
        updatedAssets,
        skippedAssets,
        failedAssets,
        rolledBackAssets,
        message: failedAssets.length > 0
          ? `已更新 ${updatedAssets.length} 個資產，${failedAssets.length} 個資產失敗並保留舊版本。`
          : `已同步 ${updatedAssets.length} 個已變更資產。`,
      }

      if (failedAssets.length === 0) {
        setLocalManifest(nextRemoteManifest)
      }
      setRefreshSummary(nextRefreshSummary)
      setRefreshStatus(nextRefreshSummary.message)
    } catch (error) {
      resetAtlasManifestCache()
      const nextRefreshSummary: DataRefreshSummary = {
        checkedAt: new Date().toISOString(),
        overallStatus: 'fallback',
        localGeneratedAt: localManifest?.generatedAt,
        remoteGeneratedAt: remoteManifest?.generatedAt,
        localContentHash: localManifest?.contentHash,
        remoteContentHash: remoteManifest?.contentHash,
        schemaVersion: localManifest?.schemaVersion,
        updatedAssets: [],
        skippedAssets: [],
        failedAssets: [],
        rolledBackAssets: [],
        message: error instanceof Error ? `無法取得遠端 manifest，沿用目前資料：${error.message}` : '無法取得遠端 manifest，沿用目前資料。',
      }
      setRefreshSummary(nextRefreshSummary)
      setRefreshStatus(nextRefreshSummary.message)
    } finally {
      setIsRefreshingData(false)
    }
  }

  return {
    summaryDataset,
    countyBoundaries,
    countyDetailCache,
    countyBucketCache,
    countySchoolAtlasCache,
    townshipBoundaryCache,
    localManifest,
    remoteManifest,
    validationReport,
    refreshSummary,
    loadError,
    countyDetailError,
    countySchoolAtlasError,
    clearCountyDetailError,
    prefetchCounty,
    prefetchAllCounties,
    refreshData,
    isRefreshingData,
    refreshStatus,
  }
}
