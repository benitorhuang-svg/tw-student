export * from './educationTypes'
export {
  getAtlasLoadObservations,
  subscribeAtlasLoadObservations,
  resetAtlasLoadObservations,
} from './atlasLoadObservation'
export {
  loadEducationSummary,
  refreshEducationSummary,
  loadCountyDetail,
  loadCountyBuckets,
  resetAtlasSqliteCache,
} from './atlasSqlite'
export {
  loadDataManifest,
  loadValidationReport,
  diffManifestAssets,
  resetAtlasManifestCache,
} from './atlasManifest'
export {
  loadCountyBoundaries,
  loadTownshipBoundaries,
  resetAtlasBoundaryCaches,
} from './atlasBoundaries'

import { loadTownshipBoundaries } from './atlasBoundaries'
import { loadCountyBuckets, loadCountyDetail, loadCountyDetailSlice } from './atlasSqlite'
import type { CountySummaryRecord } from './educationTypes'

export async function prefetchCountyResources(
  county: Pick<CountySummaryRecord, 'id' | 'detailFile' | 'townshipFile' | 'bucketFile'>,
  options?: {
    includeTownshipSlice?: boolean
    includeBucketSlice?: boolean
    includeDetailSlice?: boolean
  },
  // Optional viewport parameter to allow callers to request a spatial slice
  // of county resources. Bounds are expressed as [minLat, minLng, maxLat, maxLng].
  viewport?: { bounds?: [number, number, number, number]; zoom?: number }
) {
  const tasks: Array<Promise<unknown>> = []

  if (viewport?.bounds && options?.includeDetailSlice) {
    const [minLat, minLng, maxLat, maxLng] = viewport.bounds
    tasks.push(loadCountyDetailSlice(county.detailFile, county.id, { minLat, maxLat, minLng, maxLng }))
  } else {
    tasks.push(loadCountyDetail(county.detailFile, county.id))
  }

  if (options?.includeTownshipSlice) {
    tasks.push(loadTownshipBoundaries(county.id, county.townshipFile))
  }
  if (options?.includeBucketSlice) {
    tasks.push(loadCountyBuckets(county.bucketFile, county.id))
  }

  await Promise.allSettled(tasks)
}