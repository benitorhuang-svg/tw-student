import { useEffect, useState } from 'react'
import {
  loadCountyBuckets,
  loadCountyBoundaries,
  loadCountyDetail,
  loadCountySchoolAtlas,
  loadEducationSummary,
  loadTownshipBoundaries,
  prefetchCountyResources,
  refreshEducationSummary,
  resetAtlasBoundaryCaches,
  resetAtlasLoadObservations,
  resetSchoolAtlasCache,
  resetAtlasSqliteCache,
  type CountyBucketDataset,
  type CountyBoundaryCollection,
  type CountySchoolAtlasDataset,
  type CountyDetailDataset,
  type EducationSummaryDataset,
  type TownshipBoundaryCollection,
} from '../data/educationData'

export function useEducationData(selectedCountyId: string | null) {
  const [summaryDataset, setSummaryDataset] = useState<EducationSummaryDataset | null>(null)
  const [countyBoundaries, setCountyBoundaries] = useState<CountyBoundaryCollection | null>(null)
  const [countyDetailCache, setCountyDetailCache] = useState<Record<string, CountyDetailDataset>>({})
  const [countyBucketCache, setCountyBucketCache] = useState<Record<string, CountyBucketDataset>>({})
  const [countySchoolAtlasCache, setCountySchoolAtlasCache] = useState<Record<string, CountySchoolAtlasDataset>>({})
  const [townshipBoundaryCache, setTownshipBoundaryCache] = useState<Record<string, TownshipBoundaryCollection>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [countyDetailError, setCountyDetailError] = useState<string | null>(null)
  const [countySchoolAtlasError, setCountySchoolAtlasError] = useState<string | null>(null)
  const [isRefreshingData, setIsRefreshingData] = useState(false)
  const [refreshStatus, setRefreshStatus] = useState<string | null>(null)

  const selectedCountyForQuery = summaryDataset?.counties.find((county) => county.id === selectedCountyId) ?? null

  useEffect(() => {
    Promise.all([loadEducationSummary(), loadCountyBoundaries()])
      .then(([nextSummary, nextBoundaries]) => {
        setSummaryDataset(nextSummary)
        setCountyBoundaries(nextBoundaries)
      })
      .catch((error: Error) => setLoadError(error.message))
  }, [])

  useEffect(() => {
    if (!summaryDataset || !selectedCountyId || countyDetailCache[selectedCountyId]) return
    const county = summaryDataset.counties.find((c) => c.id === selectedCountyId)
    if (!county) return
    loadCountyDetail(county.detailFile, county.id)
      .then((detail) => setCountyDetailCache((prev) => ({ ...prev, [selectedCountyId]: detail })))
      .catch((error: Error) => setCountyDetailError(error.message))
  }, [countyDetailCache, selectedCountyId, summaryDataset])

  useEffect(() => {
    if (!summaryDataset || !selectedCountyId || townshipBoundaryCache[selectedCountyId]) return
    if (!selectedCountyForQuery) return
    loadTownshipBoundaries(selectedCountyId, selectedCountyForQuery.townshipFile)
      .then((boundaries) => setTownshipBoundaryCache((prev) => ({ ...prev, [selectedCountyId]: boundaries })))
      .catch((error: Error) => setLoadError(error.message))
  }, [selectedCountyForQuery, selectedCountyId, summaryDataset, townshipBoundaryCache])

  useEffect(() => {
    if (!summaryDataset || !selectedCountyId || countyBucketCache[selectedCountyId]) return
    if (!selectedCountyForQuery) return
    loadCountyBuckets(selectedCountyForQuery.bucketFile, selectedCountyForQuery.id)
      .then((buckets) => setCountyBucketCache((prev) => ({ ...prev, [selectedCountyId]: buckets })))
      .catch((error: Error) => setLoadError(error.message))
  }, [countyBucketCache, selectedCountyForQuery, selectedCountyId, summaryDataset])

  useEffect(() => {
    if (!summaryDataset || !selectedCountyId || countySchoolAtlasCache[selectedCountyId]) return
    if (!selectedCountyForQuery) return
    loadCountySchoolAtlas(selectedCountyForQuery.schoolAtlasFile, selectedCountyForQuery.id)
      .then((atlas) => setCountySchoolAtlasCache((prev) => ({ ...prev, [selectedCountyId]: atlas })))
      .catch((error: Error) => setCountySchoolAtlasError(error.message))
  }, [countySchoolAtlasCache, selectedCountyForQuery, selectedCountyId, summaryDataset])

  const prefetchCounty = (countyId: string | null) => {
    if (!summaryDataset || !countyId) return
    const county = summaryDataset.counties.find((c) => c.id === countyId)
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
    setRefreshStatus('清除快取並同步已部署資料...')

    try {
      if ('caches' in window) {
        const cacheKeys = await window.caches.keys()
        await Promise.all(cacheKeys.map((cacheKey) => window.caches.delete(cacheKey)))
      }

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((registration) => registration.update()))
      }

      resetAtlasSqliteCache()
      resetSchoolAtlasCache()
      resetAtlasBoundaryCaches()
      resetAtlasLoadObservations()
      setCountyDetailCache({})
      setCountyBucketCache({})
      setCountySchoolAtlasCache({})
      setTownshipBoundaryCache({})
      setCountyDetailError(null)
      setCountySchoolAtlasError(null)

      const [nextSummary, nextBoundaries] = await Promise.all([
        refreshEducationSummary(),
        loadCountyBoundaries({ forceRefresh: true }),
      ])

      let nextCountyDetailCache: Record<string, CountyDetailDataset> = {}
      let nextCountyBucketCache: Record<string, CountyBucketDataset> = {}
      let nextCountySchoolAtlasCache: Record<string, CountySchoolAtlasDataset> = {}
      let nextTownshipBoundaryCache: Record<string, TownshipBoundaryCollection> = {}

      const selectedCounty = nextSummary.counties.find((county) => county.id === selectedCountyId)
      if (selectedCounty) {
        const [detail, buckets, schoolAtlas, townshipBoundaries] = await Promise.all([
          loadCountyDetail(selectedCounty.detailFile, selectedCounty.id),
          loadCountyBuckets(selectedCounty.bucketFile, selectedCounty.id),
          loadCountySchoolAtlas(selectedCounty.schoolAtlasFile, selectedCounty.id, { forceRefresh: true }),
          loadTownshipBoundaries(selectedCounty.id, selectedCounty.townshipFile, { forceRefresh: true }),
        ])
        nextCountyDetailCache = { [selectedCounty.id]: detail }
        nextCountyBucketCache = { [selectedCounty.id]: buckets }
        nextCountySchoolAtlasCache = { [selectedCounty.id]: schoolAtlas }
        nextTownshipBoundaryCache = { [selectedCounty.id]: townshipBoundaries }
      }

      setSummaryDataset(nextSummary)
      setCountyBoundaries(nextBoundaries)
      setCountyDetailCache(nextCountyDetailCache)
      setCountyBucketCache(nextCountyBucketCache)
      setCountySchoolAtlasCache(nextCountySchoolAtlasCache)
      setTownshipBoundaryCache(nextTownshipBoundaryCache)
      setRefreshStatus(`已同步部署資料（${new Date(nextSummary.generatedAt).toLocaleString('zh-TW')}）`)
    } catch (error) {
      setRefreshStatus(error instanceof Error ? `資料更新失敗：${error.message}` : '資料更新失敗')
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
