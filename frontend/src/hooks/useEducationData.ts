import { useEffect, useState } from 'react'
import {
  loadCountyBuckets,
  loadCountyBoundaries,
  loadCountyDetail,
  loadEducationSummary,
  loadTownshipBoundaries,
  prefetchCountyResources,
  type CountyBucketDataset,
  type CountyBoundaryCollection,
  type CountyDetailDataset,
  type EducationSummaryDataset,
  type TownshipBoundaryCollection,
} from '../data/educationData'

export function useEducationData(selectedCountyId: string | null) {
  const [summaryDataset, setSummaryDataset] = useState<EducationSummaryDataset | null>(null)
  const [countyBoundaries, setCountyBoundaries] = useState<CountyBoundaryCollection | null>(null)
  const [countyDetailCache, setCountyDetailCache] = useState<Record<string, CountyDetailDataset>>({})
  const [countyBucketCache, setCountyBucketCache] = useState<Record<string, CountyBucketDataset>>({})
  const [townshipBoundaryCache, setTownshipBoundaryCache] = useState<Record<string, TownshipBoundaryCollection>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [countyDetailError, setCountyDetailError] = useState<string | null>(null)

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

  const prefetchCounty = (countyId: string | null) => {
    if (!summaryDataset || !countyId) return
    const county = summaryDataset.counties.find((c) => c.id === countyId)
    if (county) void prefetchCountyResources(county, { includeTownshipSlice: true, includeBucketSlice: true })
  }

  const prefetchAllCounties = () => {
    if (!summaryDataset) return
    summaryDataset.counties.forEach((county) => {
      void prefetchCountyResources(county, { includeTownshipSlice: true, includeBucketSlice: true })
    })
  }

  const clearCountyDetailError = () => setCountyDetailError(null)

  return {
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
  }
}
