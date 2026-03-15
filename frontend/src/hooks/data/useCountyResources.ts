import { useEffect, useState } from 'react'
import {
  loadCountyBuckets,
  loadCountyDetail,
  loadCountySchoolAtlas,
  loadTownshipBoundaries,
  prefetchCountyResources,
  type CountyBucketDataset,
  type CountySchoolAtlasDataset,
  type CountyDetailDataset,
  type EducationSummaryDataset,
  type TownshipBoundaryCollection,
} from '../../data/educationData'
import { resolveCountyRecord } from '../atlasIdentity'

export function useCountyResources(
  summaryDataset: EducationSummaryDataset | null,
  selectedCountyId: string | null
) {
  const [countyDetailCache, setCountyDetailCache] = useState<Record<string, CountyDetailDataset>>({})
  const [countyBucketCache, setCountyBucketCache] = useState<Record<string, CountyBucketDataset>>({})
  const [countySchoolAtlasCache, setCountySchoolAtlasCache] = useState<Record<string, CountySchoolAtlasDataset>>({})
  const [townshipBoundaryCache, setTownshipBoundaryCache] = useState<Record<string, TownshipBoundaryCollection>>({})
  const [countyDetailError, setCountyDetailError] = useState<string | null>(null)
  const [countySchoolAtlasError, setCountySchoolAtlasError] = useState<string | null>(null)

  const selectedCountyForQuery = resolveCountyRecord(summaryDataset, selectedCountyId)
  const selectedCountyCacheKey = selectedCountyForQuery?.id ?? null

  // 1. Load Detailed Data
  useEffect(() => {
    if (!summaryDataset || !selectedCountyCacheKey || countyDetailCache[selectedCountyCacheKey]) return
    const county = selectedCountyForQuery
    if (!county) return
    loadCountyDetail(county.detailFile, county.countyCode ?? county.id)
      .then((detail) => setCountyDetailCache((prev) => ({ ...prev, [selectedCountyCacheKey]: detail })))
      .catch((error: Error) => setCountyDetailError(error.message))
  }, [countyDetailCache, selectedCountyCacheKey, selectedCountyForQuery, summaryDataset])

  // 2. Load Township Boundaries
  useEffect(() => {
    if (!summaryDataset || !selectedCountyCacheKey || townshipBoundaryCache[selectedCountyCacheKey]) return
    if (!selectedCountyForQuery) return

    const isChiayi = selectedCountyCacheKey === '嘉義市' || selectedCountyCacheKey === '嘉義縣'
    if (isChiayi) {
      const otherId = selectedCountyCacheKey === '嘉義市' ? '嘉義縣' : '嘉義市'
      const otherCounty = summaryDataset.counties.find((c) => c.id === otherId) ?? null

      const promises: Array<Promise<TownshipBoundaryCollection | null>> = [
        loadTownshipBoundaries(selectedCountyCacheKey, selectedCountyForQuery.townshipFile),
        otherCounty ? loadTownshipBoundaries(otherId, otherCounty.townshipFile) : Promise.resolve(null),
      ]

      void Promise.allSettled(promises)
        .then((results) => {
          const nextCache: Record<string, TownshipBoundaryCollection> = {}
          const [primary, secondary] = results
          if (primary.status === 'fulfilled' && primary.value) nextCache[selectedCountyCacheKey] = primary.value
          if (secondary.status === 'fulfilled' && secondary.value && otherCounty) nextCache[otherId] = secondary.value
          setTownshipBoundaryCache((prev) => ({ ...prev, ...nextCache }))
        })
      return
    }

    loadTownshipBoundaries(selectedCountyCacheKey, selectedCountyForQuery.townshipFile)
      .then((boundaries) => setTownshipBoundaryCache((prev) => ({ ...prev, [selectedCountyCacheKey]: boundaries })))
  }, [selectedCountyCacheKey, selectedCountyForQuery, summaryDataset, townshipBoundaryCache])

  // 3. Load Buckets
  useEffect(() => {
    if (!summaryDataset || !selectedCountyCacheKey || countyBucketCache[selectedCountyCacheKey]) return
    if (!selectedCountyForQuery) return
    loadCountyBuckets(selectedCountyForQuery.bucketFile, selectedCountyForQuery.countyCode ?? selectedCountyForQuery.id)
      .then((buckets) => setCountyBucketCache((prev) => ({ ...prev, [selectedCountyCacheKey]: buckets })))
  }, [countyBucketCache, selectedCountyCacheKey, selectedCountyForQuery, summaryDataset])

  // 4. Load School Atlas
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

  return {
    countyDetailCache,
    countyBucketCache,
    countySchoolAtlasCache,
    townshipBoundaryCache,
    countyDetailError,
    countySchoolAtlasError,
    setCountyDetailCache,
    setCountyBucketCache,
    setCountySchoolAtlasCache,
    setTownshipBoundaryCache,
    setCountyDetailError,
    setCountySchoolAtlasError,
    prefetchCounty,
  }
}
