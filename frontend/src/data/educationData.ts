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
  loadCountyBoundaries,
  loadTownshipBoundaries,
  resetAtlasBoundaryCaches,
} from './atlasBoundaries'

import { loadTownshipBoundaries } from './atlasBoundaries'
import { loadCountyBuckets, loadCountyDetail } from './atlasSqlite'
import type { CountySummaryRecord } from './educationTypes'

export async function prefetchCountyResources(
  county: Pick<CountySummaryRecord, 'id' | 'detailFile' | 'townshipFile' | 'bucketFile'>,
  options?: {
    includeTownshipSlice?: boolean
    includeBucketSlice?: boolean
  },
) {
  const tasks: Array<Promise<unknown>> = [loadCountyDetail(county.detailFile, county.id)]
  if (options?.includeTownshipSlice) {
    tasks.push(loadTownshipBoundaries(county.id, county.townshipFile))
  }
  if (options?.includeBucketSlice) {
    tasks.push(loadCountyBuckets(county.bucketFile, county.id))
  }

  await Promise.allSettled(tasks)
}