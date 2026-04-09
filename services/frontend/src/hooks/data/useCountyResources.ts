import { useEffect, useMemo, useState } from 'react'
import {
  loadCountyBuckets,
  loadCountyDetail,
  loadTownshipBoundaries,
  prefetchCountyResources,
  type CountyBucketDataset,
  type CountyDetailDataset,
  type EducationSummaryDataset,
  type TownshipBoundaryCollection,
} from '../../data/educationData'
import { resolveCountyRecord } from '../atlasIdentity'

type CountyResourceLoadResult =
  | { kind: 'detail'; countyId: string; value: CountyDetailDataset }
  | { kind: 'bucket'; countyId: string; value: CountyBucketDataset }
  | { kind: 'township'; countyId: string; value: TownshipBoundaryCollection }
  | { kind: 'detail-error'; message: string }

export function useCountyResources(
  summaryDataset: EducationSummaryDataset | null,
  selectedCountyId: string | null
) {
  const [countyDetailCache, setCountyDetailCache] = useState<Record<string, CountyDetailDataset>>({})
  const [countyBucketCache, setCountyBucketCache] = useState<Record<string, CountyBucketDataset>>({})
  const [townshipBoundaryCache, setTownshipBoundaryCache] = useState<Record<string, TownshipBoundaryCollection>>({})
  const [countyDetailError, setCountyDetailError] = useState<string | null>(null)

  const selectedCountyForQuery = resolveCountyRecord(summaryDataset, selectedCountyId)
  const selectedCountyCacheKey = selectedCountyForQuery?.id ?? null

  const loadQueue = useMemo(() => {
    // We treat the selected county, any pre-selected ones in the cache,
    // and a small set of most recently viewport-observed counties as high priority.
    const keys = new Set<string>()
    if (selectedCountyCacheKey) keys.add(selectedCountyCacheKey)
    return Array.from(keys)
  }, [selectedCountyCacheKey])

  useEffect(() => {
    if (!summaryDataset) return
    const tasks: Array<Promise<CountyResourceLoadResult>> = []

    for (const cacheKey of loadQueue) {
      if (!cacheKey) continue
      const county = resolveCountyRecord(summaryDataset, cacheKey)
      if (!county) continue

      const countyCode = county.countyCode ?? county.id
      const isChiayi = cacheKey === '嘉義市' || cacheKey === '嘉義縣'

      if (!countyDetailCache[cacheKey]) {
        tasks.push(
          loadCountyDetail(county.detailFile, countyCode)
            .then((detail): CountyResourceLoadResult => ({ kind: 'detail', countyId: cacheKey, value: detail }))
            .catch((error: Error): CountyResourceLoadResult => ({ kind: 'detail-error', message: error.message })),
        )
      }

      if (!townshipBoundaryCache[cacheKey]) {
        tasks.push(
          loadTownshipBoundaries(cacheKey, county.townshipFile)
            .then((boundaries): CountyResourceLoadResult => ({ kind: 'township', countyId: cacheKey, value: boundaries })),
        )
      }

      if (isChiayi) {
        const otherId = cacheKey === '嘉義市' ? '嘉義縣' : '嘉義市'
        const otherCounty = summaryDataset.counties.find((entry) => entry.id === otherId) ?? null
        if (otherCounty && !townshipBoundaryCache[otherId]) {
          tasks.push(
            loadTownshipBoundaries(otherId, otherCounty.townshipFile)
              .then((boundaries): CountyResourceLoadResult => ({ kind: 'township', countyId: otherId, value: boundaries })),
          )
        }
      }

      if (!countyBucketCache[cacheKey]) {
        tasks.push(
          loadCountyBuckets(county.bucketFile, cacheKey)
            .then((buckets): CountyResourceLoadResult => ({ kind: 'bucket', countyId: cacheKey, value: buckets })),
        )
      }
    }

    if (!tasks.length) return

    let cancelled = false
    void Promise.all(tasks).then((results) => {
      if (cancelled) return
      const nextDetailCache: Record<string, CountyDetailDataset> = {}
      const nextBucketCache: Record<string, CountyBucketDataset> = {}
      const nextTownshipCache: Record<string, TownshipBoundaryCollection> = {}

      for (const result of results) {
        switch (result.kind) {
          case 'detail': nextDetailCache[result.countyId] = result.value; break
          case 'bucket': nextBucketCache[result.countyId] = result.value; break
          case 'township': nextTownshipCache[result.countyId] = result.value; break
          case 'detail-error': setCountyDetailError(result.message); break
        }
      }

      if (Object.keys(nextDetailCache).length > 0) setCountyDetailCache((prev) => ({ ...prev, ...nextDetailCache }))
      if (Object.keys(nextBucketCache).length > 0) setCountyBucketCache((prev) => ({ ...prev, ...nextBucketCache }))
      if (Object.keys(nextTownshipCache).length > 0) setTownshipBoundaryCache((prev) => ({ ...prev, ...nextTownshipCache }))
    })

    return () => { cancelled = true }
  }, [
    countyBucketCache,
    countyDetailCache,
    loadQueue,
    summaryDataset,
    townshipBoundaryCache,
  ])

  const prefetchCounty = (countyId: string | null, viewport?: { bounds?: [number, number, number, number]; zoom?: number }) => {
    if (!summaryDataset || !countyId) return
    const county = resolveCountyRecord(summaryDataset, countyId)
    if (!county) return

    // CRITICAL FIX: If a county is prefetched (meaning it is in or near viewport),
    // and we don't have it in the react-state cache, then LOAD IT NOW.
    if (!countyDetailCache[county.id]) {
      const countyCode = county.countyCode ?? county.id
      void loadCountyDetail(county.detailFile, countyCode)
        .then((detail) => setCountyDetailCache(prev => ({ ...prev, [county.id]: detail })))
        .catch(() => {})
      
      void loadTownshipBoundaries(county.id, county.townshipFile)
        .then((boundaries) => setTownshipBoundaryCache(prev => ({ ...prev, [county.id]: boundaries })))
        .catch(() => {})
      
      void loadCountyBuckets(county.bucketFile, county.id)
        .then((buckets) => setCountyBucketCache(prev => ({ ...prev, [county.id]: buckets })))
        .catch(() => {})
    }

    const doPrefetch = () => {
      void prefetchCountyResources(county, { includeTownshipSlice: true, includeBucketSlice: true, includeDetailSlice: Boolean(viewport?.bounds) }, viewport)
    }

    // Schedule non-urgent prefetch work during idle time to avoid blocking
    if ((window as any).requestIdleCallback) {
      (window as any).requestIdleCallback?.(() => doPrefetch(), { timeout: 2000 })
    } else {
      // Fallback
      setTimeout(doPrefetch, 200)
    }
  }

  return {
    countyDetailCache,
    countyBucketCache,
    townshipBoundaryCache,
    countyDetailError,
    setCountyDetailCache,
    setCountyBucketCache,
    setTownshipBoundaryCache,
    setCountyDetailError,
    prefetchCounty,
  }
}
