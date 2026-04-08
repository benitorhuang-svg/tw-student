import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (!summaryDataset || !selectedCountyCacheKey) return
    const county = selectedCountyForQuery
    if (!county) return
    const countyCode = county.countyCode ?? county.id
    const isChiayi = selectedCountyCacheKey === '嘉義市' || selectedCountyCacheKey === '嘉義縣'
    const tasks: Array<Promise<CountyResourceLoadResult>> = []

    if (!countyDetailCache[selectedCountyCacheKey]) {
      tasks.push(
        loadCountyDetail(county.detailFile, countyCode)
          .then((detail): CountyResourceLoadResult => ({ kind: 'detail', countyId: selectedCountyCacheKey, value: detail }))
          .catch((error: Error): CountyResourceLoadResult => ({ kind: 'detail-error', message: error.message })),
      )
    }

    if (!townshipBoundaryCache[selectedCountyCacheKey]) {
      tasks.push(
        loadTownshipBoundaries(selectedCountyCacheKey, county.townshipFile)
          .then((boundaries): CountyResourceLoadResult => ({ kind: 'township', countyId: selectedCountyCacheKey, value: boundaries })),
      )
    }

    if (isChiayi) {
      const otherId = selectedCountyCacheKey === '嘉義市' ? '嘉義縣' : '嘉義市'
      const otherCounty = summaryDataset.counties.find((entry) => entry.id === otherId) ?? null
      if (otherCounty && !townshipBoundaryCache[otherId]) {
        tasks.push(
          loadTownshipBoundaries(otherId, otherCounty.townshipFile)
            .then((boundaries): CountyResourceLoadResult => ({ kind: 'township', countyId: otherId, value: boundaries })),
        )
      }
    }

    if (!countyBucketCache[selectedCountyCacheKey]) {
      tasks.push(
        loadCountyBuckets(county.bucketFile, countyCode)
          .then((buckets): CountyResourceLoadResult => ({ kind: 'bucket', countyId: selectedCountyCacheKey, value: buckets })),
      )
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
          case 'detail':
            nextDetailCache[result.countyId] = result.value
            break
          case 'bucket':
            nextBucketCache[result.countyId] = result.value
            break
          case 'township':
            nextTownshipCache[result.countyId] = result.value
            break
          case 'detail-error':
            setCountyDetailError(result.message)
            break
        }
      }

      if (Object.keys(nextDetailCache).length > 0) {
        setCountyDetailCache((prev) => ({ ...prev, ...nextDetailCache }))
      }
      if (Object.keys(nextBucketCache).length > 0) {
        setCountyBucketCache((prev) => ({ ...prev, ...nextBucketCache }))
      }
      if (Object.keys(nextTownshipCache).length > 0) {
        setTownshipBoundaryCache((prev) => ({ ...prev, ...nextTownshipCache }))
      }
    })

    return () => {
      cancelled = true
    }
  }, [
    countyBucketCache,
    countyDetailCache,
    selectedCountyCacheKey,
    selectedCountyForQuery,
    summaryDataset,
    townshipBoundaryCache,
  ])

  const prefetchCounty = (countyId: string | null, viewport?: { bounds?: [number, number, number, number]; zoom?: number }) => {
    if (!summaryDataset || !countyId) return
    const county = resolveCountyRecord(summaryDataset, countyId)
    if (!county) return

    // Avoid redundant prefetch if we already have the county detail cached
    if (countyDetailCache[county.id]) return

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
