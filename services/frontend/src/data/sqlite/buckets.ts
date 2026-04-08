import { recordResourceLoad } from '../atlasLoadObservation'
import { mapRows } from './mappers'
import { processBucketsInWorker } from './bucketsWorkerClient'
import { resolveCountyCode } from './summary'
import type { CountyBucketDataset, RegionGroup } from '../educationTypes'

const countyBucketMemoryCache = new Map<string, CountyBucketDataset>()
const pendingCountyBucketRequests = new Map<string, Promise<CountyBucketDataset>>()

export async function loadCountyBuckets(bucketFile: string, countyId?: string) {
  const resolvedCountyId = countyId ?? bucketFile
  if (countyBucketMemoryCache.has(resolvedCountyId)) {
    recordResourceLoad({ source: 'memory', resourceKey: bucketFile, bucketCountyId: resolvedCountyId })
    return countyBucketMemoryCache.get(resolvedCountyId) as CountyBucketDataset
  }

  const pendingRequest = pendingCountyBucketRequests.get(resolvedCountyId)
  if (pendingRequest) return pendingRequest

  const nextRequest = (async () => {
    const bytes = await import('./sqliteWorkerClient').then((m) => m.initSqliteWorker())
    const countyCode = resolveCountyCode(resolvedCountyId)
    const countyRows = mapRows(await import('./sqliteWorkerClient').then(m => m.execInSqlite('SELECT * FROM counties WHERE id = ?', [countyCode])))
    const countyRow = countyRows[0]
    if (!countyRow) throw new Error(`找不到縣市 bucket：${resolvedCountyId}`)

    const bucketRows = mapRows(await import('./sqliteWorkerClient').then(m => m.execInSqlite('SELECT * FROM school_buckets WHERE county_id = ? ORDER BY precision, bucket_id', [countyCode])))
    const { precisions } = await processBucketsInWorker(bucketRows)

    const metaGeneratedAt = mapRows(await import('./sqliteWorkerClient').then(m => m.execInSqlite("SELECT value FROM meta WHERE key = 'generatedAt'")))[0]?.value

    const detail: CountyBucketDataset = {
      generatedAt: String(metaGeneratedAt ?? ''),
      county: {
        id: String(countyRow.legacy_id),
        countyCode,
        legacyCountyId: String(countyRow.legacy_id),
        name: String(countyRow.name),
        shortLabel: String(countyRow.short_label),
        region: String(countyRow.region) as RegionGroup,
      },
      precisions,
    }

    countyBucketMemoryCache.set(resolvedCountyId, detail)
    recordResourceLoad({ source: 'sqlite', resourceKey: bucketFile, bytes, bucketCountyId: resolvedCountyId })
    return detail
  })()

  pendingCountyBucketRequests.set(resolvedCountyId, nextRequest)
  try { return await nextRequest } finally { pendingCountyBucketRequests.delete(resolvedCountyId) }
}

export function resetBucketCache() {
  countyBucketMemoryCache.clear()
  pendingCountyBucketRequests.clear()
}
