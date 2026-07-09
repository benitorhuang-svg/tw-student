import { useEffect } from 'react'

import {
  prefetchCountyResources,
  type AcademicYear,
  type EducationLevelFilter,
  type EducationSummaryDataset,
  type ManagementTypeFilter,
  type RegionGroupFilter,
} from '@/shared/api/data/educationData'
import { getCountyRankingRows, getCountySummaries } from '@/shared/lib/analytics'

type UseAtlasTopPrefetchArgs = {
  summaryDataset: EducationSummaryDataset | null
  selectedCountyId: string | null
  activeYear: AcademicYear
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  region: RegionGroupFilter
  deferredSearchText: string
}

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
  cancelIdleCallback?: (handle: number) => void
}

export function useAtlasTopPrefetch({
  summaryDataset,
  selectedCountyId,
  activeYear,
  educationLevel,
  managementType,
  region,
  deferredSearchText,
}: UseAtlasTopPrefetchArgs) {
  useEffect(() => {
    if (!summaryDataset || selectedCountyId) return

    const prefetchFilters = {
      year: summaryDataset.years.includes(activeYear) ? activeYear : (summaryDataset.years.at(-1) ?? activeYear),
      educationLevel,
      managementType,
      region,
      searchText: deferredSearchText,
    }

    const topCounties = getCountyRankingRows(getCountySummaries(summaryDataset.counties, prefetchFilters))
      .slice(0, 3)
      .map((row) => summaryDataset.counties.find((county) => county.id === row.id))
      .filter((county): county is NonNullable<typeof county> => Boolean(county))

    if (topCounties.length === 0) return

    const windowWithIdle = window as WindowWithIdleCallback
    let cancelled = false
    let nextTimeoutId: number | null = null

    const runPrefetch = () => {
      let index = 0
      const runNext = () => {
        if (cancelled) return

        const county = topCounties[index]
        index += 1
        if (!county) return

        void prefetchCountyResources(county, {
          includeTownshipSlice: true,
          includeBucketSlice: true,
          includeDetailSlice: false,
        }).finally(() => {
          if (!cancelled && index < topCounties.length) {
            nextTimeoutId = window.setTimeout(runNext, 120)
          }
        })
      }

      runNext()
    }

    let timeoutId: number | null = null
    let idleId: number | null = null
    if (windowWithIdle.requestIdleCallback) {
      idleId = windowWithIdle.requestIdleCallback(runPrefetch, { timeout: 2500 })
    } else {
      timeoutId = window.setTimeout(runPrefetch, 750)
    }

    return () => {
      cancelled = true
      if (timeoutId != null) window.clearTimeout(timeoutId)
      if (nextTimeoutId != null) window.clearTimeout(nextTimeoutId)
      if (idleId != null) windowWithIdle.cancelIdleCallback?.(idleId)
    }
  }, [activeYear, deferredSearchText, educationLevel, managementType, region, selectedCountyId, summaryDataset])
}
