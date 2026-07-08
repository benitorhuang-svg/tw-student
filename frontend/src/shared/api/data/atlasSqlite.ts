import { resetConnection } from './sqlite/connection'
import { loadEducationSummaryWithOptions, resetSummaryCache } from './sqlite/summary'
import { loadCountyDetail, loadCountyDetailSlice, resetDetailCache } from './sqlite/detail'
import { loadCountyBuckets, resetBucketCache } from './sqlite/buckets'
import { resetLookupCache } from './sqlite/lookups'

export async function loadEducationSummary() {
  return loadEducationSummaryWithOptions()
}

export async function refreshEducationSummary() {
  return loadEducationSummaryWithOptions({ forceRefresh: true })
}

export { loadCountyDetail, loadCountyDetailSlice, loadCountyBuckets }

export async function resetAtlasSqliteCache() {
  resetConnection()
  const { resetSqliteWorker } = await import('./sqlite/sqliteWorkerClient')
  resetSqliteWorker()
  resetSummaryCache()
  resetDetailCache()
  resetBucketCache()
  resetLookupCache()
}
