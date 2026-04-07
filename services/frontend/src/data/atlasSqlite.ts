import { resetConnection } from './sqlite/connection'
import { loadEducationSummaryWithOptions, resetSummaryCache } from './sqlite/summary'
import { loadCountyDetail, resetDetailCache } from './sqlite/detail'
import { loadCountyBuckets, resetBucketCache } from './sqlite/buckets'

export async function loadEducationSummary() {
  return loadEducationSummaryWithOptions()
}

export async function refreshEducationSummary() {
  return loadEducationSummaryWithOptions({ forceRefresh: true })
}

export { loadCountyDetail, loadCountyBuckets }

export function resetAtlasSqliteCache() {
  resetConnection()
  resetSummaryCache()
  resetDetailCache()
  resetBucketCache()
}