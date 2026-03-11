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
export { loadCountySchoolAtlas, resetSchoolAtlasCache } from './schoolAtlas'
export {
  loadCountyBoundaries,
  loadTownshipBoundaries,
  resetAtlasBoundaryCaches,
} from './atlasBoundaries'

import { loadTownshipBoundaries } from './atlasBoundaries'
import { loadCountyBuckets, loadCountyDetail } from './atlasSqlite'
import { loadCountySchoolAtlas } from './schoolAtlas'
import type { CountySummaryRecord } from './educationTypes'

export async function prefetchCountyResources(
  county: Pick<CountySummaryRecord, 'id' | 'detailFile' | 'townshipFile' | 'bucketFile' | 'schoolAtlasFile'>,
  options?: {
    includeTownshipSlice?: boolean
    includeBucketSlice?: boolean
    includeSchoolAtlasSlice?: boolean
  },
) {
  const tasks: Array<Promise<unknown>> = [loadCountyDetail(county.detailFile, county.id)]
  if (options?.includeTownshipSlice) {
    tasks.push(loadTownshipBoundaries(county.id, county.townshipFile))
  }
  if (options?.includeBucketSlice) {
    tasks.push(loadCountyBuckets(county.bucketFile, county.id))
  }
  if (options?.includeSchoolAtlasSlice) {
    tasks.push(loadCountySchoolAtlas(county.schoolAtlasFile, county.id))
  }

  await Promise.allSettled(tasks)
}